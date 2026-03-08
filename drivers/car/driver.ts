'use strict';

import Homey from 'homey';
import { AuthClient } from '../../lib/auth/auth-client';
import { SkodaApiClient } from '../../lib/api/skoda-api-client';
import { GarageVehicle } from '../../lib/types';

class CarDriver extends Homey.Driver {

  async onInit() {
    this.log('CarDriver has been initialized');
  }

  async onPair(session: any) {
    let email = '';
    let password = '';
    let authClient: AuthClient | null = null;
    let apiClient: SkodaApiClient | null = null;

    session.setHandler('login', async (data: { username: string; password: string }) => {
      email = data.username;
      password = data.password;

      this.log(`Pairing: attempting login for ${email}`);

      try {
        authClient = new AuthClient(this.log.bind(this));
        const idkSession = await authClient.authorize(email, password);
        apiClient = new SkodaApiClient(authClient, this.log.bind(this));

        this.log('Pairing: login successful');
        return true;
      } catch (err: any) {
        this.error('Pairing: login failed:', err.message);
        throw new Error(this.homey.__('pair.login_failed') || `Login failed: ${err.message}`);
      }
    });

    session.setHandler('list_devices', async () => {
      if (!apiClient || !authClient) {
        throw new Error('Not authenticated');
      }

      this.log('Pairing: fetching garage');
      const garage = await apiClient.getGarage();

      if (!garage.vehicles || garage.vehicles.length === 0) {
        this.log('Pairing: no vehicles found');
        throw new Error(this.homey.__('pair.no_vehicles') || 'No vehicles found in your MyŠkoda account.');
      }

      this.log(`Pairing: found ${garage.vehicles.length} vehicle(s)`);

      return garage.vehicles.map((vehicle: GarageVehicle) => ({
        name: vehicle.name || vehicle.title || vehicle.vin,
        data: {
          vin: vehicle.vin,
        },
        store: {
          email: email,
          refreshToken: authClient!.refreshToken || '',
          vehicleName: vehicle.name || vehicle.title,
          vehicleTitle: vehicle.title,
          devicePlatform: vehicle.devicePlatform,
          systemModelId: vehicle.systemModelId,
        },
      }));
    });
  }

  async onRepair(session: any, device: any) {
    let authClient: AuthClient | null = null;

    session.setHandler('login', async (data: { username: string; password: string }) => {
      const email = data.username;
      const password = data.password;

      this.log(`Repair: attempting login for ${email}`);

      try {
        authClient = new AuthClient(this.log.bind(this));
        const idkSession = await authClient.authorize(email, password);

        // Update stored credentials
        await device.setStoreValue('email', email);
        await device.setStoreValue('refreshToken', authClient.refreshToken || '');

        // Reinitialize the device
        await device.initializeApiClient();

        this.log('Repair: login successful, device reinitialized');
        return true;
      } catch (err: any) {
        this.error('Repair: login failed:', err.message);
        throw new Error(`Login failed: ${err.message}`);
      }
    });
  }

}

module.exports = CarDriver;
