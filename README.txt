MyŠkoda integration for Homey.

Connect your Škoda vehicle to Homey using the MyŠkoda platform. Monitor battery level, charging status, location, and vehicle state, and control features like charging and climatization directly from Homey flows.

Features:
- Real-time vehicle data: battery level, charging status, charging power, remaining charge time, estimated range
- Vehicle status: locked/unlocked, doors, windows, trunk, bonnet state
- Climate control: start/stop air conditioning with target temperature
- Homey dashboard widgets: Vehicle Dashboard with live overview and quick actions, plus a simple Vehicle Status widget for diagnostics
- Location tracking: GPS coordinates and parking address
- Connection status: online/offline monitoring
- Outside temperature and mileage tracking
- Geofence triggers: vehicle arrived home / left home
- 5 flow trigger cards: charging started/stopped, battery below threshold, vehicle arrived/left home
- Remote lock/unlock: lock or unlock your vehicle via the device toggle or flow cards (requires MyŠkoda S-PIN)
- 3 flow condition cards with inversion support (is/is not): charging, charger connected, vehicle locked
- 8 flow action cards: refresh data, start/stop charging, start/stop climatization, set charge limit, lock/unlock vehicle
- Parking address: automatically resolved from GPS coordinates via OpenStreetMap reverse geocoding
- Insights: historical charts for battery level, temperature, mileage, range, charging power, and remaining charge time
- Device status indicators: mileage, range, remaining charge time, charging power, and battery level can be shown on the device tile
- Fully localized in English and Dutch (Nederlands)

Supported vehicles:
- Škoda Elroq, Enyaq, Enyaq Coupé (full EV support)
- Škoda Superb iV, Octavia iV (PHEV — charging & climate features)
- Other MyŠkoda-connected vehicles (basic status may work)

Requirements:
- Homey Pro or Homey Cloud with firmware 12.3.0 or newer
- A paired MyŠkoda vehicle device to use in the dashboard widget

Setup:
1. Install the app on your Homey
2. Add a new device: MyŠkoda > Car
3. Enter your MyŠkoda email and password
4. Select your vehicle(s) from the list
5. The device will start polling data automatically
6. Adjust poll interval and home location in device Settings
7. To use lock/unlock: enter your MyŠkoda S-PIN in Advanced Settings > Security

MyŠkoda S-PIN:
The S-PIN is a 4-digit security code created during the Škoda Connect app setup. It is required for remote lock/unlock actions. Configure it in the device's Advanced Settings under Security. Without it, lock/unlock will show a clear error message.

Troubleshooting:
- App not shown when adding a device: if MyŠkoda does not appear in the device list, go to More > Apps > MyŠkoda > ⋮ > Restart. After the app restarts, try adding the device again.
- Login fails: if your credentials are correct, the error popup now shows the underlying reason. Common causes include pending terms/marketing consent (accept in the official MyŠkoda app first), temporary VW identity server issues, or account lockout after too many attempts.

Lock vs. Doors:
The Locked capability and Doors open capability are independent. Locked reflects the central locking system state (locked/unlocked). Doors open reflects whether any physical door is open (open/closed). A car can be unlocked with all doors closed. These are not opposites — they represent different vehicle states.

Note: After updating to this version, you must remove and re-add the device for the renamed capabilities to appear as device status indicators.

Known limitations:
- The MyŠkoda API is cloud-based — the vehicle must have an active internet connection
- Polling interval is limited to a minimum of 5 minutes to avoid rate limiting
- Vehicle actions (charging, climate, lock/unlock) may take 30 seconds to several minutes to take effect
- Some capabilities may not be available for all vehicle models
- After app updates, you may need to remove and re-add the device for new capabilities to appear
