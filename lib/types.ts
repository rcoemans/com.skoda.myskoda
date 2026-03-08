'use strict';

export interface IDKSession {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface GarageVehicle {
  vin: string;
  name: string;
  title: string;
  state: string;
  devicePlatform: string;
  systemModelId: string;
}

export interface GarageResponse {
  vehicles?: GarageVehicle[];
  errors?: Array<{ type: string; description: string }>;
}

export interface NormalizedVehicleState {
  vin: string;
  name: string;
  model: string;
  softwareVersion?: string;
  lastUpdatedAt?: string;
  connectionStatus?: 'online' | 'offline' | 'unknown';

  batteryPercent?: number;
  targetBatteryPercent?: number;
  chargingState?: string;
  chargePowerKw?: number;
  chargeRateKmh?: number;
  remainingChargeMinutes?: number;
  chargerConnected?: boolean;
  chargerLocked?: boolean;
  chargeType?: string;

  rangeKm?: number;
  electricRangeKm?: number;
  mileageKm?: number;
  outsideTemperatureC?: number;

  locked?: boolean;
  doorsLocked?: boolean;
  doorsOpen?: boolean;
  windowsOpen?: boolean;
  trunkOpen?: boolean;
  bonnetOpen?: boolean;
  sunroofOpen?: boolean;
  lightsOn?: boolean;

  climateActive?: boolean;
  windowHeatingActive?: boolean;
  targetTemperatureC?: number;

  latitude?: number;
  longitude?: number;
  parkingAddress?: string;
}
