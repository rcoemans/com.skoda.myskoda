# MyŠkoda

[![Homey App](https://img.shields.io/badge/Homey-App%20Store-00A94F?logo=homey)](https://homey.app/en-nl/app/com.skoda.myskoda/MyŠkoda/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

Homey app for **Škoda** vehicles using the **MyŠkoda platform**. Connect your vehicle to Homey to monitor battery level, charging status, location, and vehicle state, and control features like charging and climatization directly from Homey flows.

## Disclaimer

> **This is an unofficial, community-developed integration.**
>
> - Not affiliated with, endorsed by, or supported by **Škoda Auto** or **Volkswagen Group**.
> - Škoda may change or discontinue the MyŠkoda API at any time without notice — app functionality may break as a result.
> - Use at your own risk. The developers accept no liability for data loss, incorrect readings, or unintended vehicle actions.

## Supported Vehicles

| Vehicle Type       | Support | Notes                                      |
|--------------------|---------|--------------------------------------------|
| Škoda Elroq        | ✅      | Full EV support                            |
| Škoda Enyaq / Coupé| ✅      | Full EV support                            |
| Škoda Superb iV    | ✅      | PHEV — charging & climate features         |
| Škoda Octavia iV   | ✅      | PHEV — charging & climate features         |
| Other MyŠkoda cars | ⚠️      | Basic status may work; not all features guaranteed |

> **Note:** Your vehicle must be registered and active in the MyŠkoda mobile app. The integration relies on the same cloud API used by the official app.

## Requirements

- A Škoda vehicle with active **MyŠkoda Connect** services
- A **MyŠkoda account** (the same account used in the official MyŠkoda mobile app)
- **Homey Pro** or **Homey Cloud** with SDK v3 support (firmware ≥ 12.4.0)

## Installation

### Via Homey App Store

Search for **"MyŠkoda"** in the Homey App Store.

### Via CLI (sideloading / development)

```bash
npm install -g homey
git clone https://github.com/rcoemans/com.skoda.myskoda
cd com.skoda.myskoda
npm install
homey login
homey app install
```

## Setup

1. Install the app on your Homey.
2. Add a new device: **MyŠkoda → Car**.
3. Enter your **MyŠkoda email** and **password** in the login screen.
4. Select one or more vehicles from the discovered list.
5. Confirm to complete pairing.
6. The device will start polling vehicle data automatically.

## Device Capabilities

All capabilities exposed by the Car device:

| Capability                          | Type    | Description                              |
|-------------------------------------|---------|------------------------------------------|
| `measure_battery`                   | number  | Battery state of charge (%)              |
| `locked`                            | boolean | Vehicle lock state                       |
| `measure_temperature`               | number  | Outside temperature (°C)                 |
| `my_skoda_connection_status`        | enum    | Vehicle connection status (online/offline)|
| `my_skoda_last_vehicle_update`      | string  | Timestamp of last data update            |
| `my_skoda_mileage_km`              | number  | Odometer reading (km)                    |
| `my_skoda_range_km`                | number  | Estimated remaining range (km)           |
| `my_skoda_charger_connected`        | boolean | Whether the charger cable is connected   |
| `my_skoda_charging_state`           | enum    | Charging state (charging, ready, etc.)   |
| `my_skoda_charge_power_kw`          | number  | Current charging power (kW)              |
| `my_skoda_remaining_charge_minutes` | number  | Minutes until fully charged              |
| `my_skoda_target_battery_percent`   | number  | Target charge level (%)                  |
| `my_skoda_doors_open`               | boolean | Any door open                            |
| `my_skoda_windows_open`             | boolean | Any window open                          |
| `my_skoda_trunk_open`               | boolean | Trunk open                               |
| `my_skoda_bonnet_open`              | boolean | Bonnet/hood open                         |
| `my_skoda_climate_active`           | boolean | Climate control active                   |
| `my_skoda_latitude`                 | number  | Vehicle latitude                         |
| `my_skoda_longitude`                | number  | Vehicle longitude                        |
| `my_skoda_parking_address`          | string  | Last known parking address               |

## Flow Cards

### Trigger Cards

| Card                          | Description                                      | Tokens                          |
|-------------------------------|--------------------------------------------------|---------------------------------|
| Charging started              | Fires when the vehicle starts charging           | vehicle_name, battery_percent   |
| Charging stopped              | Fires when the vehicle stops charging            | vehicle_name, battery_percent   |
| Battery drops below threshold | Fires when battery drops below a set percentage  | vehicle_name, battery_percent   |
| Vehicle arrived home          | Fires when the vehicle enters the home geofence  | vehicle_name                    |
| Vehicle left home             | Fires when the vehicle leaves the home geofence  | vehicle_name                    |

### Condition Cards

| Card                               | Description                                    |
|------------------------------------|------------------------------------------------|
| Vehicle is / is not charging       | Check if the vehicle is currently charging     |
| Charger is / is not connected      | Check if a charger cable is connected          |
| Vehicle is / is not locked         | Check if the vehicle is locked                 |

### Action Cards

| Card                    | Description                                        | Parameters          |
|-------------------------|----------------------------------------------------|---------------------|
| Refresh vehicle data    | Manually trigger a full data refresh               | —                   |
| Start charging          | Start charging the vehicle                         | —                   |
| Stop charging           | Stop charging the vehicle                          | —                   |
| Start climatization     | Start the air conditioning at a target temperature | temperature (°C)    |
| Stop climatization      | Stop the air conditioning                          | —                   |
| Set charge limit        | Set the maximum charge level                       | limit (%)           |

## Device Settings

| Setting                  | Default | Description                                                      |
|--------------------------|---------|------------------------------------------------------------------|
| Poll interval (minutes)  | 15      | How often vehicle data is refreshed (5–60 min)                   |
| Low battery threshold    | 30%     | Battery level below which a low-battery trigger fires            |
| Home latitude            | 0       | Latitude of your home for geofence triggers                      |
| Home longitude           | 0       | Longitude of your home for geofence triggers                     |
| Home radius (meters)     | 200     | Geofence radius around home coordinates                          |
| Debug logging            | Off     | Enable detailed API logging (sensitive data is redacted)         |

## Security & Privacy

- **Credentials** are stored securely in the Homey device store and are never logged.
- **Refresh tokens** are used for session management; passwords are not persisted after pairing.
- **Sensitive data** (VIN, GPS coordinates, tokens) are redacted in all log output.
- All communication with the MyŠkoda API uses **HTTPS**.

## Known Limitations

- The MyŠkoda API is a **cloud-based** service — the vehicle must have an active internet connection.
- **Polling interval** is limited to a minimum of 5 minutes to avoid rate limiting.
- **Vehicle actions** (start/stop charging, climate) may take 30 seconds to several minutes to take effect.
- Some capabilities may not be available for all vehicle models or firmware versions.
- The API may be temporarily unavailable during MyŠkoda server maintenance.
- After app updates, you may need to remove and re-add the device for new capabilities to appear.

## Technical Details

- **SDK:** Homey SDK v3
- **Language:** TypeScript
- **Authentication:** OAuth2 PKCE flow via VW Group Identity (same as the official MyŠkoda app)
- **API:** REST endpoints at `mysmob.api.connect.skoda-auto.cz`
- **Data refresh:** Configurable polling (default 15 min) with post-action burst refreshes

## Credits

This app is a co-creation between **Robert Coemans** and **Claude** (Anthropic), built using **[Windsurf](https://windsurf.com)** — an AI-powered IDE for collaborative software development.

If you like this, consider [buying me a coffee](https://buymeacoffee.com/kabxpqqg7z).

Pull requests and issue reports are welcome on [GitHub](https://github.com/rcoemans/com.skoda.myskoda/issues).

## Acknowledgements

This Homey app builds on existing community efforts around the MyŠkoda ecosystem.

- **API reference:** [myskoda Python library](https://pypi.org/project/myskoda/) maintained by the skodaconnect community  
- **Inspiration:** [Home Assistant MySkoda integration](https://github.com/skodaconnect/homeassistant-myskoda)

These projects provided helpful insights into the available MyŠkoda API functionality.
