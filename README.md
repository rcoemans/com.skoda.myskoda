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
- **Homey Pro** or **Homey Cloud** with SDK v3 support (firmware ≥ 12.3.0)

## Widgets

The app includes two widgets for Homey dashboards:

### Vehicle Dashboard

- **Live overview**: battery level, charging state, range, lock state, plug state, climate state, parking address, and last update
- **Quick actions**: refresh vehicle data, start/stop charging, and start/stop climatization
- **Device picker**: select a paired MyŠkoda vehicle directly when placing the widget
- **Widget settings**: configure the climatization target temperature and choose whether to show the parking address

The widget uses the same capabilities and action methods as the paired vehicle device, so it stays in sync with the app without changing existing flow or device behavior.

### Vehicle Status

A simple status widget that confirms the app is running and widgets are functioning correctly. Useful for diagnostics.

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
| `meter_mileage_km`                  | number  | Odometer reading (km) — device indicator |
| `meter_range_km`                    | number  | Estimated remaining range (km) — device indicator |
| `my_skoda_charger_connected`        | boolean | Whether the charger cable is connected   |
| `my_skoda_charging_state`           | enum    | Charging state (charging, ready, etc.)   |
| `measure_charge_power_kw`           | number  | Current charging power (kW) — device indicator |
| `meter_remaining_charge_minutes`    | number  | Minutes until fully charged — device indicator |
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
| Lock vehicle            | Remotely lock the vehicle (requires S-PIN)         | —                   |
| Unlock vehicle          | Remotely unlock the vehicle (requires S-PIN)       | —                   |

## Device Settings

| Setting                  | Default | Description                                                      |
|--------------------------|---------|------------------------------------------------------------------|
| Poll interval (minutes)  | 15      | How often vehicle data is refreshed (5–60 min)                   |
| Low battery threshold    | 30%     | Battery level below which a low-battery trigger fires            |
| Home latitude            | 0       | Latitude of your home for geofence triggers                      |
| Home longitude           | 0       | Longitude of your home for geofence triggers                     |
| Home radius (meters)     | 200     | Geofence radius around home coordinates                          |
| MyŠkoda S-PIN            | —       | 4-digit security code for remote lock/unlock (see below)         |
| Debug logging            | Off     | Enable detailed API logging (sensitive data is redacted)         |

### MyŠkoda S-PIN

The MyŠkoda S-PIN is a **4-digit security code** created during the Škoda Connect app setup to authorize remote services like locking and unlocking. It is set up via the MyŠkoda mobile app and can be reset or changed within the app settings.

The S-PIN must be configured in the device's **Advanced Settings → Security** before lock/unlock actions (flow cards or the device toggle) will work. Without it, you will receive a clear error message explaining how to configure it.

## Security & Privacy

- **Credentials** are stored securely in the Homey device store and are never logged.
- **Refresh tokens** are used for session management; passwords are not persisted after pairing.
- **Sensitive data** (VIN, GPS coordinates, tokens) are redacted in all log output.
- All communication with the MyŠkoda API uses **HTTPS**.

## Troubleshooting

### MyŠkoda app not shown when adding a device

If the MyŠkoda app does not appear in the list when trying to add a new device, go to **More → Apps → MyŠkoda → ⋮ → Restart**. After the app restarts, try adding the device again.

### Login fails with "Check your email and password"

If you are sure your credentials are correct, the error popup now includes the underlying reason so you can diagnose the issue. Common causes:

- **Terms & conditions or marketing consent required** — Open the official MyŠkoda mobile app, log in, and accept any pending consent screens. Then retry pairing in Homey.
- **VW identity server temporarily unavailable** — Wait a few minutes and try again.
- **Account locked** — Too many failed attempts can temporarily lock your account. Wait ~15 minutes.

If the popup shows a technical error (e.g. "Failed to find window._IDK"), please open an issue on GitHub with the error text.

## Parking Address

The parking address is automatically resolved from the vehicle's GPS coordinates using **OpenStreetMap Nominatim** reverse geocoding. If the MyŠkoda API does not provide an address directly, the app will look up the latitude/longitude and display a human-readable address.

## Insights

The following capabilities are available as **Homey Insights** for historical charts:

- Battery level, Outside temperature (built-in)
- Mileage (`meter_mileage_km`), Range (`meter_range_km`), Remaining charge time (`meter_remaining_charge_minutes`), Charging power (`measure_charge_power_kw`)

## Device Status Indicators

You can add the following capabilities as **Device Status Indicators** on your Homey device tile: Battery level, Mileage, Range, Remaining charge time, Charging power, and Outside temperature. These capabilities use the `measure_` or `meter_` prefix, which is required by Homey to make them selectable as device tile indicators.

> **Note:** After updating to this version, you must **remove and re-add the device** for the renamed capabilities to appear as device status indicators.

## Lock vs. Doors

The **Locked** capability (`locked`) and **Doors open** capability (`my_skoda_doors_open`) are **independent**:

- **Locked** reflects the central locking system state (locked/unlocked).
- **Doors open** reflects whether any physical door is open (open/closed).

A car can be unlocked with all doors closed, or locked with doors closed. These are not opposites — they represent different vehicle states.

## Known Limitations

- The MyŠkoda API is a **cloud-based** service — the vehicle must have an active internet connection.
- **Polling interval** is limited to a minimum of 5 minutes to avoid rate limiting.
- **Vehicle actions** (start/stop charging, climate, lock/unlock) may take 30 seconds to several minutes to take effect.
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
