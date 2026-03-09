'use strict';

import Homey from 'homey';
import { AuthClient } from '../../lib/auth/auth-client';
import { SkodaApiClient } from '../../lib/api/skoda-api-client';
import { VehicleNormalizer } from '../../lib/api/vehicle-normalizer';
import { NormalizedVehicleState } from '../../lib/types';
import { isAtHome } from '../../lib/utils/geo';
import { redactVin } from '../../lib/utils/redact';
import { httpRequest } from '../../lib/utils/http';
import {
  DEFAULT_POLL_INTERVAL_MINUTES,
  POST_ACTION_REFRESH_DELAYS_MS,
} from '../../lib/constants';

class CarDevice extends Homey.Device {

  private authClient!: AuthClient;
  private apiClient!: SkodaApiClient;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private previousState: NormalizedVehicleState | null = null;
  private wasAtHome: boolean | null = null;

  async onInit() {
    const vin = this.getData().vin;
    this.log(`Initializing device for VIN ${redactVin(vin)}`);

    await this.initializeApiClient();
    this._registerCapabilityListeners();
    this._startPolling();

    this.log(`Device initialized for VIN ${redactVin(vin)}`);
  }

  async initializeApiClient(): Promise<void> {
    const refreshToken = this.getStoreValue('refreshToken');
    const email = this.getStoreValue('email');

    this.authClient = new AuthClient(this.log.bind(this));

    try {
      if (refreshToken) {
        await this.authClient.authorizeWithRefreshToken(refreshToken);
        this.log('Authorized via refresh token');
      } else {
        this.log('No refresh token available, device needs repair');
        this.setUnavailable(this.homey.__('device.auth_required') || 'Authentication required. Please re-pair this device.').catch(this.error);
        return;
      }

      this.apiClient = new SkodaApiClient(this.authClient, this.log.bind(this));

      // Store updated refresh token
      if (this.authClient.refreshToken) {
        await this.setStoreValue('refreshToken', this.authClient.refreshToken);
      }

      await this.setAvailable();
      await this.refreshVehicleData();
    } catch (err: any) {
      this.error('Failed to initialize API client:', err.message);
      this.setUnavailable(this.homey.__('device.auth_failed') || `Authentication failed: ${err.message}`).catch(this.error);
    }
  }

  private _startPolling(): void {
    this._stopPolling();

    const intervalMinutes = this.getSetting('poll_interval') || DEFAULT_POLL_INTERVAL_MINUTES;
    const intervalMs = intervalMinutes * 60 * 1000;

    this.log(`Starting poll timer: every ${intervalMinutes} minutes`);
    this.pollInterval = setInterval(async () => {
      try {
        await this.refreshVehicleData();
      } catch (err: any) {
        this.error('Polling error:', err.message);
      }
    }, intervalMs);

    // Also do an initial refresh
    this.refreshVehicleData().catch((err) => this.error('Initial refresh error:', err.message));
  }

  private _stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async refreshVehicleData(): Promise<void> {
    if (!this.apiClient) {
      this.log('API client not initialized, skipping refresh');
      return;
    }

    const vin = this.getData().vin;
    this.log(`Refreshing data for VIN ${redactVin(vin)}`);

    try {
      // Fetch all endpoints in parallel
      const [info, status, charging, airConditioning, drivingRange, positions, connectionStatus] = await Promise.allSettled([
        this.apiClient.getVehicleInfo(vin),
        this.apiClient.getVehicleStatus(vin),
        this.apiClient.getCharging(vin),
        this.apiClient.getAirConditioning(vin),
        this.apiClient.getDrivingRange(vin),
        this.apiClient.getPositions(vin),
        this.apiClient.getConnectionStatus(vin),
      ]);

      const state = VehicleNormalizer.normalize(
        vin,
        info.status === 'fulfilled' ? info.value : null,
        status.status === 'fulfilled' ? status.value : null,
        charging.status === 'fulfilled' ? charging.value : null,
        airConditioning.status === 'fulfilled' ? airConditioning.value : null,
        drivingRange.status === 'fulfilled' ? drivingRange.value : null,
        positions.status === 'fulfilled' ? positions.value : null,
        connectionStatus.status === 'fulfilled' ? connectionStatus.value : null,
      );

      // Update refresh token if it changed
      if (this.authClient.refreshToken) {
        const storedToken = this.getStoreValue('refreshToken');
        if (storedToken !== this.authClient.refreshToken) {
          await this.setStoreValue('refreshToken', this.authClient.refreshToken);
        }
      }

      // Reverse geocode parking address if lat/lng available but no address from API
      if (state.latitude && state.longitude && !state.parkingAddress) {
        state.parkingAddress = await this._reverseGeocode(state.latitude, state.longitude);
      }

      await this._updateCapabilities(state);
      await this._checkTriggers(state);

      this.previousState = state;
      await this.setAvailable();

      this.log(`Data refresh complete for VIN ${redactVin(vin)}`);
    } catch (err: any) {
      this.error(`Failed to refresh data for VIN ${redactVin(vin)}:`, err.message);

      // If auth error, mark unavailable
      if (err.message?.includes('401') || err.message?.includes('Not authorized')) {
        this.setUnavailable(this.homey.__('device.auth_expired') || 'Authentication expired. Please re-pair this device.').catch(this.error);
      }
    }
  }

  private async _updateCapabilities(state: NormalizedVehicleState): Promise<void> {
    await this._safeSetCapability('measure_battery', state.batteryPercent);
    await this._safeSetCapability('locked', state.locked);
    await this._safeSetCapability('measure_temperature', state.outsideTemperatureC);
    await this._safeSetCapability('my_skoda_connection_status', state.connectionStatus || 'unknown');
    await this._safeSetCapability('my_skoda_mileage_km', state.mileageKm);
    await this._safeSetCapability('my_skoda_range_km', state.rangeKm);
    await this._safeSetCapability('my_skoda_charger_connected', state.chargerConnected);
    await this._safeSetCapability('my_skoda_charging_state', state.chargingState || 'unknown');
    await this._safeSetCapability('my_skoda_charge_power_kw', state.chargePowerKw);
    await this._safeSetCapability('my_skoda_remaining_charge_minutes', state.remainingChargeMinutes);
    await this._safeSetCapability('my_skoda_target_battery_percent', state.targetBatteryPercent);
    await this._safeSetCapability('my_skoda_doors_open', state.doorsOpen);
    await this._safeSetCapability('my_skoda_windows_open', state.windowsOpen);
    await this._safeSetCapability('my_skoda_trunk_open', state.trunkOpen);
    await this._safeSetCapability('my_skoda_bonnet_open', state.bonnetOpen);
    await this._safeSetCapability('my_skoda_climate_active', state.climateActive);
    await this._safeSetCapability('my_skoda_latitude', state.latitude);
    await this._safeSetCapability('my_skoda_longitude', state.longitude);
    await this._safeSetCapability('my_skoda_parking_address', state.parkingAddress);

    // Format last updated
    if (state.lastUpdatedAt) {
      try {
        const date = new Date(state.lastUpdatedAt);
        const formatted = date.toLocaleString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        await this._safeSetCapability('my_skoda_last_vehicle_update', formatted);
      } catch {
        await this._safeSetCapability('my_skoda_last_vehicle_update', state.lastUpdatedAt);
      }
    }
  }

  private async _safeSetCapability(capabilityId: string, value: any): Promise<void> {
    if (value === undefined || value === null) return;
    try {
      if (this.hasCapability(capabilityId)) {
        await this.setCapabilityValue(capabilityId, value);
      }
    } catch (err: any) {
      this.error(`Failed to set capability ${capabilityId}:`, err.message);
    }
  }

  private async _checkTriggers(state: NormalizedVehicleState): Promise<void> {
    const prev = this.previousState;
    const vehicleName = state.name || state.vin;

    // Charging started
    if (prev && prev.chargingState !== 'charging' && state.chargingState === 'charging') {
      this.log('Trigger: charging started');
      const card = this.homey.flow.getDeviceTriggerCard('charging_started');
      await card.trigger(this, {
        vehicle_name: vehicleName,
        battery_percent: state.batteryPercent ?? 0,
      }).catch(this.error);
    }

    // Charging stopped
    if (prev && prev.chargingState === 'charging' && state.chargingState !== 'charging') {
      this.log('Trigger: charging stopped');
      const card = this.homey.flow.getDeviceTriggerCard('charging_stopped');
      await card.trigger(this, {
        vehicle_name: vehicleName,
        battery_percent: state.batteryPercent ?? 0,
      }).catch(this.error);
    }

    // Battery below threshold — trigger on any battery drop, let RunListener filter per-flow threshold
    if (
      prev &&
      state.batteryPercent !== undefined &&
      prev.batteryPercent !== undefined &&
      state.batteryPercent < prev.batteryPercent
    ) {
      this.log(`Trigger: battery dropped (${prev.batteryPercent}% → ${state.batteryPercent}%)`);
      const card = this.homey.flow.getDeviceTriggerCard('battery_below_threshold');
      await card.trigger(this, {
        vehicle_name: vehicleName,
        battery_percent: state.batteryPercent,
      }, { battery_percent: state.batteryPercent }).catch(this.error);
    }

    // Home arrival / departure
    const homeLat = this.getSetting('home_latitude');
    const homeLon = this.getSetting('home_longitude');
    const homeRadius = this.getSetting('home_radius') || 200;

    if (homeLat && homeLon && state.latitude && state.longitude) {
      const atHome = isAtHome(state.latitude, state.longitude, homeLat, homeLon, homeRadius);

      if (this.wasAtHome !== null) {
        if (!this.wasAtHome && atHome) {
          this.log('Trigger: vehicle arrived home');
          const card = this.homey.flow.getDeviceTriggerCard('vehicle_arrived_home');
          await card.trigger(this, { vehicle_name: vehicleName }).catch(this.error);
        }
        if (this.wasAtHome && !atHome) {
          this.log('Trigger: vehicle left home');
          const card = this.homey.flow.getDeviceTriggerCard('vehicle_left_home');
          await card.trigger(this, { vehicle_name: vehicleName }).catch(this.error);
        }
      }

      this.wasAtHome = atHome;
    }
  }

  private _registerCapabilityListeners(): void {
    // Lock/unlock toggle — requires S-PIN
    if (this.hasCapability('locked')) {
      this.registerCapabilityListener('locked', async (value: boolean) => {
        const spin = this.getSetting('spin');
        if (!spin) {
          throw new Error(
            'MyŠkoda S-PIN is required to lock/unlock the vehicle. ' +
            'Please configure it in the device\'s Advanced Settings under Security.',
          );
        }
        const vin = this.getData().vin;
        if (value) {
          this.log(`Action: lock vehicle for VIN ${redactVin(vin)}`);
          await this.apiClient.lockVehicle(vin, spin);
        } else {
          this.log(`Action: unlock vehicle for VIN ${redactVin(vin)}`);
          await this.apiClient.unlockVehicle(vin, spin);
        }
        this._schedulePostActionRefresh();
      });
    }
  }

  // --- Public action methods (called from flow cards) ---

  async lockVehicle(): Promise<void> {
    const spin = this.getSetting('spin');
    if (!spin) {
      throw new Error(
        'MyŠkoda S-PIN is required to lock the vehicle. ' +
        'Please configure it in the device\'s Advanced Settings under Security.',
      );
    }
    const vin = this.getData().vin;
    this.log(`Action: lock vehicle for VIN ${redactVin(vin)}`);
    await this.apiClient.lockVehicle(vin, spin);
    this._schedulePostActionRefresh();
  }

  async unlockVehicle(): Promise<void> {
    const spin = this.getSetting('spin');
    if (!spin) {
      throw new Error(
        'MyŠkoda S-PIN is required to unlock the vehicle. ' +
        'Please configure it in the device\'s Advanced Settings under Security.',
      );
    }
    const vin = this.getData().vin;
    this.log(`Action: unlock vehicle for VIN ${redactVin(vin)}`);
    await this.apiClient.unlockVehicle(vin, spin);
    this._schedulePostActionRefresh();
  }

  async startCharging(): Promise<void> {
    const vin = this.getData().vin;
    this.log(`Action: start charging for VIN ${redactVin(vin)}`);
    await this.apiClient.startCharging(vin);
    this._schedulePostActionRefresh();
  }

  async stopCharging(): Promise<void> {
    const vin = this.getData().vin;
    this.log(`Action: stop charging for VIN ${redactVin(vin)}`);
    await this.apiClient.stopCharging(vin);
    this._schedulePostActionRefresh();
  }

  async setChargeLimit(limitPercent: number): Promise<void> {
    const vin = this.getData().vin;
    this.log(`Action: set charge limit to ${limitPercent}% for VIN ${redactVin(vin)}`);
    await this.apiClient.setChargeLimit(vin, limitPercent);
    this._schedulePostActionRefresh();
  }

  async startClimate(temperatureC: number): Promise<void> {
    const vin = this.getData().vin;
    this.log(`Action: start climate at ${temperatureC}°C for VIN ${redactVin(vin)}`);
    await this.apiClient.startAirConditioning(vin, temperatureC);
    this._schedulePostActionRefresh();
  }

  async stopClimate(): Promise<void> {
    const vin = this.getData().vin;
    this.log(`Action: stop climate for VIN ${redactVin(vin)}`);
    await this.apiClient.stopAirConditioning(vin);
    this._schedulePostActionRefresh();
  }

  /**
   * Schedule delayed refreshes after an action to pick up the new state.
   */
  private _schedulePostActionRefresh(): void {
    for (const delayMs of POST_ACTION_REFRESH_DELAYS_MS) {
      setTimeout(async () => {
        try {
          await this.refreshVehicleData();
        } catch (err: any) {
          this.error('Post-action refresh error:', err.message);
        }
      }, delayMs);
    }
  }

  /**
   * Reverse geocode lat/lng to a human-readable address using OpenStreetMap Nominatim.
   * Returns null on failure so the capability is simply not set.
   */
  private async _reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await httpRequest(url, {
        headers: {
          'User-Agent': 'HomeyMySkodaApp/1.0',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });
      if (response.statusCode === 200 && response.body) {
        const data = JSON.parse(response.body);
        if (data.display_name) {
          return data.display_name;
        }
      }
    } catch (err: any) {
      this.error('Reverse geocode failed:', err.message);
    }
    return undefined;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }: {
    oldSettings: Record<string, any>;
    newSettings: Record<string, any>;
    changedKeys: string[];
  }): Promise<string | void> {
    if (changedKeys.includes('poll_interval')) {
      this.log(`Poll interval changed to ${newSettings.poll_interval} minutes`);
      this._startPolling();
    }
  }

  async onDeleted() {
    this._stopPolling();
    this.log('Device deleted');
  }

  async onUninit() {
    this._stopPolling();
  }

}

module.exports = CarDevice;
