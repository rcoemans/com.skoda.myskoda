'use strict';

import { httpRequest } from '../utils/http';
import { AuthClient } from '../auth/auth-client';
import { BASE_URL_SKODA, MAX_API_RETRIES, RETRY_BACKOFF_BASE_MS } from '../constants';
import { GarageResponse } from '../types';

export class SkodaApiClient {
  private auth: AuthClient;
  private log: (...args: any[]) => void;

  constructor(auth: AuthClient, log: (...args: any[]) => void) {
    this.auth = auth;
    this.log = log;
  }

  private async _headers(): Promise<Record<string, string>> {
    const token = await this.auth.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async _get(path: string): Promise<any> {
    return this._requestWithRetry('GET', path);
  }

  private async _post(path: string, body?: any): Promise<any> {
    return this._requestWithRetry('POST', path, body);
  }

  private async _put(path: string, body?: any): Promise<any> {
    return this._requestWithRetry('PUT', path, body);
  }

  private async _requestWithRetry(method: string, path: string, body?: any): Promise<any> {
    const url = `${BASE_URL_SKODA}/api${path}`;

    for (let attempt = 0; attempt < MAX_API_RETRIES; attempt++) {
      try {
        const headers = await this._headers();
        const response = await httpRequest(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          timeout: 60000,
        });

        if (response.statusCode === 401) {
          this.log('Received 401, refreshing token and retrying');
          await this.auth.refreshAccessToken();
          continue;
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          if (!response.body || response.body.trim() === '') return null;
          try {
            return JSON.parse(response.body);
          } catch {
            return response.body;
          }
        }

        if (response.statusCode >= 500) {
          this.log(`Server error ${response.statusCode} on ${method} ${path}, retrying (${attempt + 1}/${MAX_API_RETRIES})`);
          await this._delay(RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt));
          continue;
        }

        throw new Error(`API request ${method} ${path} failed with status ${response.statusCode}: ${response.body}`);
      } catch (err: any) {
        if (attempt === MAX_API_RETRIES - 1) throw err;
        this.log(`Request error on ${method} ${path}, retrying (${attempt + 1}/${MAX_API_RETRIES}):`, err.message);
        await this._delay(RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt));
      }
    }
    throw new Error(`API request ${method} ${path} failed after ${MAX_API_RETRIES} retries`);
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- Garage / Vehicle Discovery ---

  async getGarage(): Promise<GarageResponse> {
    return this._get('/v2/garage?connectivityGenerations=MOD1&connectivityGenerations=MOD2&connectivityGenerations=MOD3&connectivityGenerations=MOD4');
  }

  async getVehicleInfo(vin: string): Promise<any> {
    return this._get(`/v2/garage/vehicles/${vin}?connectivityGenerations=MOD1&connectivityGenerations=MOD2&connectivityGenerations=MOD3&connectivityGenerations=MOD4`);
  }

  // --- Vehicle Status ---

  async getVehicleStatus(vin: string): Promise<any> {
    return this._get(`/v2/vehicle-status/${vin}`);
  }

  // --- Charging ---

  async getCharging(vin: string): Promise<any> {
    return this._get(`/v1/charging/${vin}`);
  }

  // --- Air Conditioning ---

  async getAirConditioning(vin: string): Promise<any> {
    return this._get(`/v2/air-conditioning/${vin}`);
  }

  // --- Driving Range ---

  async getDrivingRange(vin: string): Promise<any> {
    return this._get(`/v2/vehicle-status/${vin}/driving-range`);
  }

  // --- Positions ---

  async getPositions(vin: string): Promise<any> {
    return this._get(`/v1/maps/positions?vin=${vin}`);
  }

  async getParkingPosition(vin: string): Promise<any> {
    return this._get(`/v3/maps/positions/vehicles/${vin}/parking`);
  }

  // --- Connection Status ---

  async getConnectionStatus(vin: string): Promise<any> {
    return this._get(`/v2/connection-status/${vin}/readiness`);
  }

  // --- Actions ---

  async startCharging(vin: string): Promise<void> {
    await this._post(`/v1/charging/${vin}/start`);
  }

  async stopCharging(vin: string): Promise<void> {
    await this._post(`/v1/charging/${vin}/stop`);
  }

  async setChargeLimit(vin: string, limitPercent: number): Promise<void> {
    await this._put(`/v1/charging/${vin}/set-charge-limit`, {
      targetSOCInPercent: limitPercent,
    });
  }

  async startAirConditioning(vin: string, temperatureC: number): Promise<void> {
    const roundTemp = Math.round(temperatureC * 2) / 2;
    await this._post(`/v2/air-conditioning/${vin}/start`, {
      heaterSource: 'ELECTRIC',
      targetTemperature: {
        temperatureValue: roundTemp,
        unitInCar: 'CELSIUS',
      },
    });
  }

  async stopAirConditioning(vin: string): Promise<void> {
    await this._post(`/v2/air-conditioning/${vin}/stop`);
  }

  async startWindowHeating(vin: string): Promise<void> {
    await this._post(`/v2/air-conditioning/${vin}/start-window-heating`);
  }

  async stopWindowHeating(vin: string): Promise<void> {
    await this._post(`/v2/air-conditioning/${vin}/stop-window-heating`);
  }

  async wakeup(vin: string): Promise<void> {
    await this._post(`/v1/vehicle-wakeup/${vin}?applyRequestLimiter=true`);
  }
}
