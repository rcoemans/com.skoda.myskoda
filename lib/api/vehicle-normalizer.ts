'use strict';

import { NormalizedVehicleState } from '../types';

/**
 * Normalize raw API responses into a unified vehicle state object.
 * Each method is safe to call with null/undefined data.
 */
export class VehicleNormalizer {

  static normalize(
    vin: string,
    info: any,
    status: any,
    charging: any,
    airConditioning: any,
    drivingRange: any,
    positions: any,
    connectionStatus: any,
  ): NormalizedVehicleState {
    const state: NormalizedVehicleState = {
      vin,
      name: '',
      model: '',
    };

    VehicleNormalizer._applyInfo(state, info);
    VehicleNormalizer._applyStatus(state, status);
    VehicleNormalizer._applyCharging(state, charging);
    VehicleNormalizer._applyAirConditioning(state, airConditioning);
    VehicleNormalizer._applyDrivingRange(state, drivingRange);
    VehicleNormalizer._applyPositions(state, positions);
    VehicleNormalizer._applyConnectionStatus(state, connectionStatus);

    return state;
  }

  private static _applyInfo(state: NormalizedVehicleState, info: any): void {
    if (!info) return;
    state.name = info.name || state.vin;
    state.softwareVersion = info.softwareVersion;

    const spec = info.specification;
    if (spec) {
      state.model = `${spec.title || spec.model || ''}`.trim();
    }
  }

  private static _applyStatus(state: NormalizedVehicleState, status: any): void {
    if (!status) return;

    if (status.carCapturedTimestamp) {
      state.lastUpdatedAt = status.carCapturedTimestamp;
    }

    if (status.mileageInKm != null) {
      state.mileageKm = status.mileageInKm;
    }

    const overall = status.overall;
    if (overall) {
      state.locked = overall.locked === 'LOCKED';
      state.doorsLocked = overall.doorsLocked === 'LOCKED';
      state.doorsOpen = overall.doors === 'OPEN';
      state.windowsOpen = overall.windows === 'OPEN';
      state.lightsOn = overall.lights === 'ON';
    }

    const detail = status.detail;
    if (detail) {
      state.trunkOpen = detail.trunk === 'OPEN';
      state.bonnetOpen = detail.bonnet === 'OPEN';
      state.sunroofOpen = detail.sunroof === 'OPEN';
    }
  }

  private static _applyCharging(state: NormalizedVehicleState, charging: any): void {
    if (!charging) return;

    if (charging.carCapturedTimestamp && !state.lastUpdatedAt) {
      state.lastUpdatedAt = charging.carCapturedTimestamp;
    }

    const chargingStatus = charging.status;
    if (chargingStatus) {
      state.chargingState = VehicleNormalizer._normalizeChargingState(chargingStatus.state);
      state.chargePowerKw = chargingStatus.chargePowerInKw ?? undefined;
      state.chargeRateKmh = chargingStatus.chargingRateInKilometersPerHour ?? undefined;
      state.remainingChargeMinutes = chargingStatus.remainingTimeToFullyChargedInMinutes ?? undefined;
      state.chargeType = chargingStatus.chargeType ?? undefined;

      const battery = chargingStatus.battery;
      if (battery) {
        state.batteryPercent = battery.stateOfChargeInPercent ?? undefined;
        if (battery.remainingCruisingRangeInMeters != null) {
          state.rangeKm = Math.round(battery.remainingCruisingRangeInMeters / 1000);
        }
      }
    }

    const settings = charging.settings;
    if (settings) {
      state.targetBatteryPercent = settings.targetStateOfChargeInPercent ?? undefined;
    }

    // Determine charger connection from charging state
    if (chargingStatus?.state) {
      const s = chargingStatus.state.toUpperCase();
      state.chargerConnected = s !== 'CONNECT_CABLE';
    }
  }

  private static _normalizeChargingState(raw: string | undefined): string {
    if (!raw) return 'unknown';
    const map: Record<string, string> = {
      'READY_FOR_CHARGING': 'ready_for_charging',
      'CONNECT_CABLE': 'connect_cable',
      'CONSERVING': 'conserving',
      'CHARGING': 'charging',
      'CHARGING_INTERRUPTED': 'charging_interrupted',
      'ERROR': 'error',
    };
    return map[raw.toUpperCase()] || 'unknown';
  }

  private static _applyAirConditioning(state: NormalizedVehicleState, ac: any): void {
    if (!ac) return;

    const acState = (ac.state || '').toUpperCase();
    state.climateActive = acState !== 'OFF' && acState !== '' && acState !== 'INVALID';

    if (ac.targetTemperature) {
      state.targetTemperatureC = ac.targetTemperature.temperatureValue;
    }

    if (ac.outsideTemperature) {
      state.outsideTemperatureC = ac.outsideTemperature.temperatureValue;
    }

    const windowHeatingState = ac.windowHeatingState;
    if (windowHeatingState) {
      state.windowHeatingActive =
        windowHeatingState.front === 'ON' || windowHeatingState.rear === 'ON';
    }

    // Charger connection from AC endpoint
    if (ac.chargerConnectionState && state.chargerConnected === undefined) {
      state.chargerConnected = ac.chargerConnectionState === 'CONNECTED';
    }
  }

  private static _applyDrivingRange(state: NormalizedVehicleState, range: any): void {
    if (!range) return;

    if (range.totalRangeInKm != null && state.rangeKm === undefined) {
      state.rangeKm = range.totalRangeInKm;
    }

    const primary = range.primaryEngineRange;
    if (primary) {
      if (primary.engineType === 'electric' && primary.currentSoCInPercent != null) {
        if (state.batteryPercent === undefined) {
          state.batteryPercent = primary.currentSoCInPercent;
        }
      }
      if (primary.remainingRangeInKm != null) {
        state.electricRangeKm = primary.remainingRangeInKm;
        if (state.rangeKm === undefined) {
          state.rangeKm = primary.remainingRangeInKm;
        }
      }
    }
  }

  private static _applyPositions(state: NormalizedVehicleState, positions: any): void {
    if (!positions) return;

    // positions endpoint returns an array of position objects
    let vehiclePos: any = null;

    if (Array.isArray(positions)) {
      vehiclePos = positions.find((p: any) => p.type === 'VEHICLE') || positions[0];
    } else if (positions.positions && Array.isArray(positions.positions)) {
      vehiclePos = positions.positions.find((p: any) => p.type === 'VEHICLE') || positions.positions[0];
    } else if (positions.lat !== undefined || positions.latitude !== undefined) {
      vehiclePos = positions;
    }

    if (vehiclePos) {
      const coords = vehiclePos.gpsCoordinates || vehiclePos;
      state.latitude = coords.latitude ?? coords.lat;
      state.longitude = coords.longitude ?? coords.lng ?? coords.lon;
    }
  }

  private static _applyConnectionStatus(state: NormalizedVehicleState, cs: any): void {
    if (!cs) return;
    // The connection status endpoint returns an array of statuses or a single object
    if (cs.connectionStatus) {
      state.connectionStatus = cs.connectionStatus === 'ONLINE' ? 'online' : 'offline';
    } else {
      state.connectionStatus = 'unknown';
    }
  }
}
