'use strict';

import Homey from 'homey';

class MySkodaApp extends Homey.App {

  async onInit() {
    this.log('MyŠkoda app is starting...');

    try {
      this._registerFlowActions();
    } catch (err: any) {
      this.error('Failed to register flow action cards:', err.message);
    }

    try {
      this._registerFlowConditions();
    } catch (err: any) {
      this.error('Failed to register flow condition cards:', err.message);
    }

    try {
      this._registerFlowTriggers();
    } catch (err: any) {
      this.error('Failed to register flow trigger cards:', err.message);
    }

    this.log('MyŠkoda app initialized');
  }

  private _registerFlowActions(): void {
    // Refresh vehicle data
    this.homey.flow.getActionCard('refresh_vehicle')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        await device.refreshVehicleData();
      });

    // Start charging
    this.homey.flow.getActionCard('start_charging')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        await device.startCharging();
      });

    // Stop charging
    this.homey.flow.getActionCard('stop_charging')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        await device.stopCharging();
      });

    // Start climatization
    this.homey.flow.getActionCard('start_climate')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        const temperature = args.temperature;
        await device.startClimate(temperature);
      });

    // Stop climatization
    this.homey.flow.getActionCard('stop_climate')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        await device.stopClimate();
      });

    // Set charge limit
    this.homey.flow.getActionCard('set_charge_limit')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        const limit = args.limit;
        await device.setChargeLimit(limit);
      });

    // Lock vehicle
    this.homey.flow.getActionCard('lock_vehicle')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        await device.lockVehicle();
      });

    // Unlock vehicle
    this.homey.flow.getActionCard('unlock_vehicle')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        await device.unlockVehicle();
      });

    this.log('Flow action cards registered');
  }

  private _registerFlowConditions(): void {
    // Vehicle is charging
    this.homey.flow.getConditionCard('vehicle_is_charging')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        const chargingState = device.getCapabilityValue('my_skoda_charging_state');
        return chargingState === 'charging';
      });

    // Charger is connected
    this.homey.flow.getConditionCard('charger_is_connected')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        return device.getCapabilityValue('my_skoda_charger_connected') === true;
      });

    // Vehicle is locked
    this.homey.flow.getConditionCard('vehicle_is_locked')
      .registerRunListener(async (args: any) => {
        const device = args.device;
        return device.getCapabilityValue('locked') === true;
      });

    this.log('Flow condition cards registered');
  }

  private _registerFlowTriggers(): void {
    // Battery below threshold needs a RunListener to match the user-configured threshold arg
    this.homey.flow.getDeviceTriggerCard('battery_below_threshold')
      .registerRunListener(async (args: any, state: any) => {
        return state.battery_percent < args.threshold;
      });

    this.log('Flow trigger cards registered');
  }

}

module.exports = MySkodaApp;
