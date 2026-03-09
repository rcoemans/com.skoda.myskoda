'use strict';

function normalizeDevices(devices) {
  if (Array.isArray(devices)) return devices;
  if (devices && typeof devices === 'object') return Object.values(devices);
  return [];
}

function getDeviceInstanceId(device) {
  if (!device) return null;
  if (typeof device.getId === 'function') return device.getId();
  if (typeof device.id === 'string') return device.id;
  return null;
}

function getDeviceName(device) {
  if (!device) return 'MyŠkoda';
  if (typeof device.getName === 'function') return device.getName();
  return 'MyŠkoda';
}

function getDriver(homey) {
  return homey.drivers.getDriver('car');
}

function getAllDevices(homey) {
  const driver = getDriver(homey);
  return normalizeDevices(driver.getDevices());
}

function findDevice(homey, deviceId) {
  const devices = getAllDevices(homey);

  if (deviceId) {
    const selected = devices.find((device) => getDeviceInstanceId(device) === deviceId);
    if (selected) return selected;
  }

  return devices[0] || null;
}

function capability(device, capabilityId, fallback = null) {
  try {
    const value = device.getCapabilityValue(capabilityId);
    return value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function boolLabel(value, positive, negative) {
  return value ? positive : negative;
}

function buildState(device) {
  const batteryPercent = capability(device, 'measure_battery');
  const chargingState = capability(device, 'my_skoda_charging_state', 'unknown');
  const climateActive = capability(device, 'my_skoda_climate_active', false);
  const locked = capability(device, 'locked', null);
  const chargerConnected = capability(device, 'my_skoda_charger_connected', null);
  const rangeKm = capability(device, 'my_skoda_range_km');
  const lastUpdated = capability(device, 'my_skoda_last_vehicle_update');
  const connectionStatus = capability(device, 'my_skoda_connection_status', 'unknown');
  const chargePowerKw = capability(device, 'my_skoda_charge_power_kw');
  const remainingChargeMinutes = capability(device, 'my_skoda_remaining_charge_minutes');
  const parkingAddress = capability(device, 'my_skoda_parking_address');
  const outsideTemperatureC = capability(device, 'measure_temperature');

  return {
    id: getDeviceInstanceId(device),
    name: getDeviceName(device),
    batteryPercent,
    chargingState,
    climateActive,
    locked,
    chargerConnected,
    rangeKm,
    lastUpdated,
    connectionStatus,
    chargePowerKw,
    remainingChargeMinutes,
    parkingAddress,
    outsideTemperatureC,
    isCharging: chargingState === 'charging',
    chargingLabel: String(chargingState || 'unknown').replace(/_/g, ' '),
    lockLabel: locked === null ? 'unknown' : boolLabel(locked, 'locked', 'unlocked'),
    plugLabel: chargerConnected === null ? 'unknown' : boolLabel(chargerConnected, 'connected', 'disconnected'),
    climateLabel: boolLabel(climateActive, 'active', 'off'),
  };
}

async function requireDevice(homey, deviceId) {
  const device = findDevice(homey, deviceId);
  if (!device) {
    const error = new Error('No MyŠkoda vehicle selected.');
    error.statusCode = 404;
    throw error;
  }
  return device;
}

module.exports = {
  async getState({ homey, query }) {
    const device = await requireDevice(homey, query.deviceId);
    return buildState(device);
  },

  async refreshVehicle({ homey, body }) {
    const device = await requireDevice(homey, body?.deviceId);
    await device.refreshVehicleData();
    return buildState(device);
  },

  async startCharging({ homey, body }) {
    const device = await requireDevice(homey, body?.deviceId);
    await device.startCharging();
    return { success: true };
  },

  async stopCharging({ homey, body }) {
    const device = await requireDevice(homey, body?.deviceId);
    await device.stopCharging();
    return { success: true };
  },

  async startClimate({ homey, body }) {
    const device = await requireDevice(homey, body?.deviceId);
    const temperature = Number(body?.temperature ?? 21);
    await device.startClimate(temperature);
    return { success: true };
  },

  async stopClimate({ homey, body }) {
    const device = await requireDevice(homey, body?.deviceId);
    await device.stopClimate();
    return { success: true };
  },
};
