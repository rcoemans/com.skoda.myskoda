MyŠkoda integration for Homey.

Connect your Škoda vehicle to Homey using the MyŠkoda platform. Monitor battery level, charging status, location, and vehicle state, and control features like charging and climatization directly from Homey flows.

Features:
- Real-time vehicle data: battery level, charging status, charging power, remaining charge time, estimated range
- Vehicle status: locked/unlocked, doors, windows, trunk, bonnet state
- Climate control: start/stop air conditioning with target temperature
- Location tracking: GPS coordinates and parking address
- Connection status: online/offline monitoring
- Outside temperature and mileage tracking
- Geofence triggers: vehicle arrived home / left home
- 5 flow trigger cards: charging started/stopped, battery below threshold, vehicle arrived/left home
- 3 flow condition cards with inversion support (is/is not): charging, charger connected, vehicle locked
- 6 flow action cards: refresh data, start/stop charging, start/stop climatization, set charge limit
- Fully localized in English and Dutch (Nederlands)

Supported vehicles:
- Škoda Elroq, Enyaq, Enyaq Coupé (full EV support)
- Škoda Superb iV, Octavia iV (PHEV — charging & climate features)
- Other MyŠkoda-connected vehicles (basic status may work)

Setup:
1. Install the app on your Homey
2. Add a new device: MyŠkoda > Car
3. Enter your MyŠkoda email and password
4. Select your vehicle(s) from the list
5. The device will start polling data automatically
6. Adjust poll interval and home location in device Settings

Known limitations:
- The MyŠkoda API is cloud-based — the vehicle must have an active internet connection
- Polling interval is limited to a minimum of 5 minutes to avoid rate limiting
- Vehicle actions may take 30 seconds to several minutes to take effect
- Some capabilities may not be available for all vehicle models
- After app updates, you may need to remove and re-add the device for new capabilities to appear
