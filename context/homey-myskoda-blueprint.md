# Homey App Blueprint: MyŠkoda Integration

## Goal
Build a Homey app that connects to the MyŠkoda cloud backend and exposes one Homey device per vehicle, starting with a reliable polling-based integration and leaving MQTT push as a second phase.

This blueprint is based on the two uploaded archives:

- `homeassistant-myskoda-main.zip`
- `myskoda-2.6.1.tar.gz`

## Executive conclusion
Yes, the uploaded repositories provide enough implementation detail to build a Homey app for MyŠkoda.

The strongest evidence is that they already contain:

- the full authentication flow, including PKCE and refresh tokens
- concrete REST endpoints and payload shapes
- entity and feature mapping used by Home Assistant
- MQTT event handling design
- Elroq fixtures for testing

The largest engineering risk is not the vehicle data model. It is the Node.js reimplementation of the VW Group / MyŠkoda authentication flow.

---

## Source material to port

### Python library: `myskoda-2.6.1`
Use this as the primary API reference.

Key files:

- `myskoda/const.py`
  - API base URLs
  - identity host
  - client ID
  - redirect URI
  - MQTT broker details
- `myskoda/auth/authorization.py`
  - login flow
  - PKCE
  - code exchange
  - token refresh
- `myskoda/rest_api.py`
  - concrete REST calls and payloads
- `myskoda/myskoda.py`
  - orchestration layer
- `myskoda/mqtt.py`
  - MQTT subscription mechanics
- `myskoda/models/*`
  - response models and capability structure
- `fixtures/elroq_2025_PYLJK2_85.yaml`
- `fixtures/elroq_2025_PYLQK2_Sportline.yaml`

### Home Assistant integration: `homeassistant-myskoda-main`
Use this as the primary product-design reference.

Key files:

- `docs/entities.md`
  - entity inventory
- `docs/design.md`
  - hybrid push/pull strategy
- `custom_components/myskoda/config_flow.py`
  - setup flow reference
- `custom_components/myskoda/coordinator.py`
  - refresh coordination
- `custom_components/myskoda/sensor.py`
- `custom_components/myskoda/binary_sensor.py`
- `custom_components/myskoda/switch.py`
- `custom_components/myskoda/number.py`
- `custom_components/myskoda/climate.py`
- `custom_components/myskoda/button.py`
- `custom_components/myskoda/lock.py`
- `custom_components/myskoda/device_tracker.py`

---

## Recommended product scope

### Phase 1: MVP
Build a stable read-mostly app with a few high-value actions.

Include:

- account login
- vehicle discovery
- one Homey device per vehicle
- periodic polling
- manual refresh action
- battery, charging, range, lock, door/window, mileage, temperature, location
- start/stop charging
- start/stop climate
- set charge limit

Do not include yet:

- MQTT push
- departure timers
- AC timers
- battery care mode
- honk/flash
- complex charging profiles
- advanced S-PIN flows beyond lock/unlock if possible

### Phase 2
Add:

- MQTT push updates
- richer charging settings
- lock/unlock with S-PIN
- optional map image support via URL in insights or tokens
- richer flow cards

### Phase 3
Add:

- timer management
- advanced climate presets
- per-model capability toggling
- operation history and diagnostics screens

---

## Recommended Homey device model

## Driver strategy
Use one driver per broad vehicle type, but a single generic driver is acceptable for v1.

Recommended initial driver:

- `car`

Alternative later:

- `ev`
- `phev`
- `ice`

For v1, a single generic driver with conditional capabilities is simpler and safer.

## Device identity
Each Homey device should represent exactly one VIN.

Suggested unique data object:

```json
{
  "vin": "...",
  "id": "...",
  "model": "Elroq",
  "type": "EV"
}
```

Recommended Homey device name:

- user-visible vehicle name from garage info
- fallback: `Škoda <model> (<last 6 of VIN>)`

---

## Capability blueprint

Use native Homey capabilities where they fit. Use custom capabilities where Homey has no good equivalent.

## Native capabilities to use where possible

Suggested native capabilities:

- `measure_battery` for battery percentage
- `alarm_battery` only if you add a low-battery threshold setting
- `locked` for lock state
- `alarm_contact` for any-open aggregate if desired
- `measure_temperature` for outside temperature
- `meter_distance` for odometer or remaining range only if you keep semantics clear
- `onoff` only for a dedicated action device, otherwise avoid overloading it

Because a car has many domain-specific states, expect several custom capabilities.

## Custom capabilities recommended

### Status and telemetry
- `my_skoda_connection_status`
  - values: `online`, `offline`, `unknown`
- `my_skoda_last_vehicle_update`
  - timestamp string or epoch
- `my_skoda_last_operation`
  - values such as `in_progress`, `success`, `warning`, `error`
- `my_skoda_vehicle_in_motion`
  - boolean
- `my_skoda_mileage_km`
  - number
- `my_skoda_range_km`
  - number
- `my_skoda_electric_range_km`
  - number
- `my_skoda_combustion_range_km`
  - number
- `my_skoda_charge_rate_kmh`
  - number
- `my_skoda_charge_power_kw`
  - number
- `my_skoda_remaining_charge_minutes`
  - number
- `my_skoda_charge_type`
  - enum: `ac`, `dc`, `unknown`
- `my_skoda_charging_state`
  - enum: `ready`, `charging`, `conserving`, `stopped`, `error`, `unknown`
- `my_skoda_target_battery_percent`
  - number
- `my_skoda_software_version`
  - text

### Binary aggregate states
- `my_skoda_charger_connected`
- `my_skoda_charger_locked`
- `my_skoda_doors_locked`
- `my_skoda_doors_open`
- `my_skoda_windows_open`
- `my_skoda_trunk_open`
- `my_skoda_bonnet_open`
- `my_skoda_sunroof_open`
- `my_skoda_lights_on`

### Per-opening details
- `my_skoda_door_front_left_open`
- `my_skoda_door_front_right_open`
- `my_skoda_door_rear_left_open`
- `my_skoda_door_rear_right_open`
- `my_skoda_window_front_left_open`
- `my_skoda_window_front_right_open`
- `my_skoda_window_rear_left_open`
- `my_skoda_window_rear_right_open`

### Climate and charging controls
- `my_skoda_climate_active`
- `my_skoda_window_heating_active`
- `my_skoda_battery_care_mode`
- `my_skoda_reduced_current`
- `my_skoda_auto_unlock_plug`
- `my_skoda_target_temperature_c`

### Location
For location, use Homey geolocation support if available in the SDK for device state, and also store:

- `my_skoda_latitude`
- `my_skoda_longitude`
- `my_skoda_parking_address`

That gives both flow access and easier diagnostics.

## MVP capability set for an Elroq
This is the lean set I would actually ship first:

- `measure_battery`
- `locked`
- `measure_temperature`
- `my_skoda_connection_status`
- `my_skoda_last_vehicle_update`
- `my_skoda_mileage_km`
- `my_skoda_range_km`
- `my_skoda_charger_connected`
- `my_skoda_charging_state`
- `my_skoda_charge_power_kw`
- `my_skoda_remaining_charge_minutes`
- `my_skoda_target_battery_percent`
- `my_skoda_doors_open`
- `my_skoda_windows_open`
- `my_skoda_trunk_open`
- `my_skoda_bonnet_open`
- `my_skoda_climate_active`
- `my_skoda_latitude`
- `my_skoda_longitude`
- `my_skoda_parking_address`

---

## Flow card blueprint

Homey flow cards should focus on common EV automations and reliable states.

## Triggers

### Vehicle state triggers
- When battery percentage changes
- When battery percentage drops below a threshold
- When charger connected changes
- When charging starts
- When charging stops
- When charging state changes
- When remaining range changes
- When vehicle becomes locked
- When vehicle becomes unlocked
- When any door opens
- When all doors close
- When trunk opens
- When climate starts
- When climate stops
- When vehicle arrives at home
- When vehicle leaves home
- When connection status changes
- When last operation finishes with error

### Suggested trigger tokens
- vehicle name
- VIN
- battery percent
- range km
- charging state
- charging power kw
- parking address
- operation name
- operation result

## Conditions
- Battery percentage is below X
- Battery percentage is above X
- Vehicle is charging
- Charger is connected
- Vehicle is locked
- Any door is open
- Any window is open
- Climate is active
- Vehicle is at home
- Vehicle is away from home
- Last operation status is success
- Last operation status is error

## Actions
### Safe v1 actions
- Refresh vehicle data
- Start charging
- Stop charging
- Start climate
- Stop climate
- Set charge limit
- Wake vehicle

### v2 actions
- Lock vehicle
- Unlock vehicle
- Set target temperature
- Toggle reduced current
- Toggle battery care mode
- Toggle auto unlock plug
- Toggle window heating

### v3 actions
- Enable departure timer
- Disable departure timer
- Update departure timer schedule
- Enable AC timer
- Disable AC timer

## Recommended first-flow set
If you want to keep the first release tight, implement exactly these:

#### Triggers
- charging started
- charging stopped
- battery below threshold
- vehicle arrived home
- vehicle left home

#### Conditions
- vehicle is charging
- charger connected
- locked

#### Actions
- refresh
- start charging
- stop charging
- start climate
- stop climate
- set charge limit

---

## App settings blueprint

Split settings into three levels:

## App-level settings
These apply to the whole account session.

### Authentication
- email / username
- password
- optional S-PIN

Do not expose raw tokens in settings UI.
Store access token and refresh token securely in Homey store.

### Polling
- poll interval in minutes
  - default: 15
  - minimum: 5
  - recommended max: 60
- startup refresh delay in seconds
  - default: 10
- retry backoff enabled
  - default: true

### Behavior
- create location capabilities
  - default: true
- enable advanced actions
  - default: false
- enable wake-up action
  - default: false
- enable MQTT experimental mode
  - default: false in v1

### Diagnostics
- debug logging
  - default: false
- redact sensitive logs
  - default: true

## Device-level settings
Per vehicle.

- custom device name
- home latitude
- home longitude
- home radius meters
  - default: 200
- low battery threshold
  - default: 30
- stale data threshold minutes
  - default: 120
- hide unsupported capabilities
  - default: true
- prefer electric range over total range
  - default: true for EV

## Hidden secure storage
Use Homey app store or secret storage for:

- access token
- refresh token
- token expiry
- auth metadata
- S-PIN if the user allows it

If possible, store S-PIN separately and allow a mode where the app asks for it only during setup of protected actions.

---

## Pairing and setup flow

## Pairing UX
1. User installs app.
2. User starts pairing.
3. User enters MyŠkoda email and password.
4. App performs login and token exchange.
5. App calls garage endpoint and lists vehicles.
6. User selects one or more vehicles.
7. App creates one Homey device per selected VIN.
8. App performs initial refresh.
9. Optional: ask whether to enable advanced actions and provide S-PIN.

## Notes
- If Homey pairing UI supports multi-select, use it.
- If auth is fragile, provide precise login error messages:
  - invalid credentials
  - MFA or unexpected login page
  - consent page not handled
  - rate limited
  - service unavailable

---

## Data refresh design

## Recommended v1 strategy: polling only
Use polling for the first version.

Recommended schedule:

- full refresh on startup
- full refresh after pairing
- full refresh every 15 minutes by default
- manual refresh flow action and device action
- temporary short retry after action:
  - +15 seconds
  - +45 seconds
  - +120 seconds

This is enough for most Homey automations and avoids MQTT complexity in v1.

## Recommended v2 strategy: hybrid push/pull
Mirror the Home Assistant design:

- subscribe to MQTT topics for all discovered VINs
- on relevant event, fetch only affected endpoints
- postpone next full poll after an event-driven refresh
- keep a fallback full refresh every 30 minutes

This aligns with `docs/design.md` from the HA integration.

---

## API layer design for Node.js

## Architecture
Port the Python code into a small layered Node.js client inside the Homey app.

Recommended internal layers:

1. `AuthClient`
   - handles PKCE, authorize, login forms, token exchange, refresh, revoke
2. `ApiClient`
   - wraps HTTP requests, headers, retries, auth injection
3. `VehicleRepository`
   - fetches and normalizes vehicle data from multiple endpoints
4. `OperationService`
   - executes remote actions and tracks operation status
5. `PollingScheduler`
   - staggered refreshes and backoff
6. `MqttService`
   - optional later
7. `CapabilityMapper`
   - converts normalized vehicle state into Homey capability updates

## Endpoints to implement first
Based on the uploaded code and docs, prioritize these:

### Auth
- authorization code exchange
- refresh token

### Vehicle discovery
- garage vehicles
- vehicle info or status overview

### Status
- vehicle status
- driving range
- charging status
- maintenance report
- parking position / maps positions
- connection status
- air conditioning status

### Actions
- charging start
- charging stop
- set charge limit
- climate start
- climate stop
- wake up vehicle

### Later
- lock / unlock
- charging current
- battery care mode
- auto unlock plug
- timers

---

## Suggested normalization model

Create one normalized internal vehicle object regardless of raw endpoint shape.

```ts
interface NormalizedVehicleState {
  vin: string;
  name: string;
  model: string;
  softwareVersion?: string;
  lastUpdatedAt?: string;
  connectionStatus?: 'online' | 'offline' | 'unknown';
  inMotion?: boolean;

  batteryPercent?: number;
  targetBatteryPercent?: number;
  chargingState?: string;
  chargePowerKw?: number;
  chargeRateKmh?: number;
  remainingChargeMinutes?: number;
  chargerConnected?: boolean;
  chargerLocked?: boolean;
  chargeType?: 'ac' | 'dc' | 'unknown';

  rangeKm?: number;
  electricRangeKm?: number;
  combustionRangeKm?: number;
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

  lastOperationName?: string;
  lastOperationStatus?: 'in_progress' | 'success' | 'warning' | 'error';
}
```

This normalized object becomes the only thing the Homey device class consumes.

---

## Recommended app file structure

```text
com.example.myskoda/
├─ app.json
├─ app.js
├─ package.json
├─ README.md
├─ assets/
│  └─ images/
├─ .homeycompose/
│  ├─ app.json
│  ├─ capabilities/
│  │  ├─ my_skoda_connection_status.json
│  │  ├─ my_skoda_charging_state.json
│  │  ├─ my_skoda_charge_power_kw.json
│  │  ├─ my_skoda_remaining_charge_minutes.json
│  │  ├─ my_skoda_range_km.json
│  │  ├─ my_skoda_mileage_km.json
│  │  ├─ my_skoda_charger_connected.json
│  │  ├─ my_skoda_doors_open.json
│  │  ├─ my_skoda_windows_open.json
│  │  ├─ my_skoda_trunk_open.json
│  │  ├─ my_skoda_bonnet_open.json
│  │  ├─ my_skoda_climate_active.json
│  │  ├─ my_skoda_target_battery_percent.json
│  │  ├─ my_skoda_last_vehicle_update.json
│  │  └─ ...
│  ├─ drivers/
│  │  └─ car/
│  │     ├─ driver.compose.json
│  │     ├─ driver.settings.compose.json
│  │     ├─ flow/
│  │     │  ├─ triggers/
│  │     │  ├─ conditions/
│  │     │  └─ actions/
│  │     └─ assets/
│  └─ flow/
│     └─ ...
├─ drivers/
│  └─ car/
│     ├─ driver.js
│     └─ device.js
├─ lib/
│  ├─ auth/
│  │  ├─ pkce.js
│  │  ├─ csrf-parser.js
│  │  ├─ auth-client.js
│  │  └─ token-store.js
│  ├─ api/
│  │  ├─ api-client.js
│  │  ├─ endpoints.js
│  │  ├─ request-queue.js
│  │  └─ error-map.js
│  ├─ services/
│  │  ├─ garage-service.js
│  │  ├─ vehicle-service.js
│  │  ├─ charging-service.js
│  │  ├─ climate-service.js
│  │  ├─ operation-service.js
│  │  ├─ refresh-service.js
│  │  └─ mqtt-service.js
│  ├─ mappers/
│  │  ├─ vehicle-normalizer.js
│  │  ├─ capability-mapper.js
│  │  └─ flow-token-mapper.js
│  ├─ utils/
│  │  ├─ logger.js
│  │  ├─ redact.js
│  │  ├─ geo.js
│  │  ├─ retry.js
│  │  └─ time.js
│  └─ constants.js
├─ test/
│  ├─ fixtures/
│  │  ├─ elroq_2025_PYLJK2_85.json
│  │  └─ elroq_2025_PYLQK2_Sportline.json
│  ├─ auth.test.js
│  ├─ normalizer.test.js
│  ├─ capability-mapper.test.js
│  └─ operations.test.js
└─ docs/
   ├─ architecture.md
   ├─ api-notes.md
   └─ supported-models.md
```

---

## Module-by-module responsibilities

## `app.js`
- initialize shared services
- register flow cards
- manage app-level token/session state
- expose diagnostics helpers

## `drivers/car/driver.js`
- pairing flow
- credential collection
- vehicle listing
- Homey device creation

## `drivers/car/device.js`
- per-vehicle lifecycle
- capability registration
- refresh scheduling hook-in
- action handlers
- capability updates
- flow trigger firing

## `lib/auth/pkce.js`
- generate verifier and challenge
- mirror Python auth helper behavior

## `lib/auth/csrf-parser.js`
- parse HTML forms and hidden inputs
- equivalent of Python CSRF/login page parsing

## `lib/auth/auth-client.js`
- orchestrate full login flow
- exchange code for token
- refresh token
- detect expired auth and retry once

## `lib/auth/token-store.js`
- secure read/write of tokens and expiry
- token invalidation on logout or auth failure

## `lib/api/api-client.js`
- common fetch wrapper
- attach bearer token
- retry on transient errors
- map 401 to refresh flow
- map 429 to backoff

## `lib/api/endpoints.js`
- all route builders in one place
- helps contain API drift

## `lib/services/garage-service.js`
- fetch garage and available vehicles

## `lib/services/vehicle-service.js`
- fetch status, range, maintenance, position, connection state
- compose normalized state object

## `lib/services/charging-service.js`
- start/stop charging
- set charge limit
- later: reduced current, care mode, auto-unlock plug

## `lib/services/climate-service.js`
- start/stop climate
- later: temperature and window heating settings

## `lib/services/operation-service.js`
- track asynchronous operations
- update operation capability and flow triggers

## `lib/services/refresh-service.js`
- full refresh scheduling
- post-action rechecks
- stale data detection

## `lib/services/mqtt-service.js`
- deferred until v2
- subscribe and route incoming events to targeted refreshes

## `lib/mappers/vehicle-normalizer.js`
- convert raw MyŠkoda payloads into a stable internal state model
- hide model/version differences

## `lib/mappers/capability-mapper.js`
- map normalized state into Homey capability values
- prevent unnecessary updates
- handle unsupported/null states cleanly

## `lib/utils/geo.js`
- home/away radius checks
- location change significance

---

## Flow implementation map

## Trigger detection examples
- `charging started`
  - previous `chargingState != charging`
  - next `chargingState == charging`
- `vehicle arrived home`
  - previous outside geofence
  - next inside geofence
- `battery below threshold`
  - previous `>= threshold`
  - next `< threshold`
- `operation failed`
  - operation event or polling result changes to `error`

Store previous normalized state per device so transitions are easy to detect.

---

## Action implementation map

## Start charging
- endpoint in charging API
- after request:
  - set `last operation = in_progress`
  - schedule follow-up refreshes
  - update to `success/warning/error` once confirmed

## Stop charging
Same pattern as start charging.

## Set charge limit
- validate allowed values
- use a fixed allowed set based on API behavior
- after request, refresh charging state and target battery percentage

## Start climate / stop climate
- treat as asynchronous remote action
- update climate capability optimistically only if Homey UX benefits from it
- always reconcile with server state on next refresh

## Lock / unlock
Reserve for v2 unless S-PIN handling is stable.

---

## Error-handling blueprint

Map errors into user-friendly buckets.

## Auth errors
- invalid credentials
- login page changed
- consent or MFA step unsupported
- refresh token invalid

## API errors
- rate limited
- backend unavailable
- temporary vehicle offline
- operation rejected by vehicle
- operation requires S-PIN
- unsupported by current model

## Device-state errors
- stale vehicle data
- vehicle in motion, no GPS available
- capability unsupported on this vehicle

Recommended behavior:

- never mark the device unavailable for one transient API failure
- mark unavailable only after repeated failures or invalid auth
- surface last error in a diagnostic capability or device warning

---

## Security and privacy notes

- Do not log password, tokens, VIN in full, GPS coordinates, or S-PIN in plain text.
- Redact all secrets in debug logs.
- Prefer storing only the minimum token metadata needed.
- S-PIN should be optional and disabled by default.
- Consider masking VIN to last 6 characters in UI logs.

---

## Testing plan

## Unit tests
Build tests around the uploaded fixtures and known API responses.

Priority tests:

- PKCE generation
- auth redirect/code parsing
- token refresh logic
- Elroq fixture normalization
- capability mapping for EV states
- charging state transition detection
- home/away geofence detection
- null/unsupported feature handling

## Integration-style tests
Mock HTTP responses for:

- login flow
- garage discovery
- status refresh
- charging action
- climate action
- auth refresh during expired token

## Manual test matrix
At minimum:

- Elroq
- Enyaq
- one ICE or PHEV model if later supported

Test cases:

- first login
- app restart with saved refresh token
- vehicle offline
- charge cable connected/disconnected
- charging start/stop
- climate start/stop
- home arrival/leave flows

---

## Capability support matrix strategy

Not every vehicle will support every endpoint.

Use a per-device support map built during initial discovery.

Example:

```ts
{
  supportsCharging: true,
  supportsClimate: true,
  supportsPosition: true,
  supportsLock: false,
  supportsTimers: false
}
```

Then:

- only add relevant capabilities where possible, or
- keep capabilities but hide/disable unsupported actions

For v1, I recommend:

- always create a consistent minimal capability set for EVs
- disable unsupported actions rather than constantly adding/removing capabilities dynamically

---

## Recommended release plan

## Release 0.1.0
- login
- vehicle pairing
- polling
- battery, charging, range, lock, doors/windows, mileage, climate state, position
- refresh action
- start/stop charging
- start/stop climate
- set charge limit

## Release 0.2.0
- better diagnostics
- low battery triggers
- home/away triggers
- optional wake-up action
- improved retry/backoff

## Release 0.3.0
- MQTT experimental push mode
- operation event mapping
- faster refresh after events

## Release 0.4.0
- S-PIN actions
- lock/unlock
- advanced charging options

---

## Concrete MVP recommendation

If the goal is to get an Elroq working in Homey as quickly as possible, build this exact subset first:

### Capabilities
- battery percent
- charging state
- charger connected
- charging power
- remaining charging time
- target charge limit
- range
- lock state
- doors open
- windows open
- trunk open
- bonnet open
- climate active
- outside temperature
- mileage
- latitude/longitude/address
- last update
- connection status

### Flow cards
#### Triggers
- charging started
- charging stopped
- battery below threshold
- arrived home
- left home

#### Conditions
- is charging
- is locked
- charger connected

#### Actions
- refresh
- start charging
- stop charging
- start climate
- stop climate
- set charge limit

### Settings
- credentials
- optional S-PIN
- poll interval
- home coordinates and radius
- low battery threshold
- debug logging

### Files needed immediately
- `app.js`
- `drivers/car/driver.js`
- `drivers/car/device.js`
- `lib/auth/auth-client.js`
- `lib/auth/pkce.js`
- `lib/auth/csrf-parser.js`
- `lib/auth/token-store.js`
- `lib/api/api-client.js`
- `lib/api/endpoints.js`
- `lib/services/garage-service.js`
- `lib/services/vehicle-service.js`
- `lib/services/charging-service.js`
- `lib/services/climate-service.js`
- `lib/services/refresh-service.js`
- `lib/mappers/vehicle-normalizer.js`
- `lib/mappers/capability-mapper.js`
- custom capability JSON files in `.homeycompose/capabilities/`
- driver and flow compose files in `.homeycompose/drivers/car/`

---

## Final verdict

The uploaded MyŠkoda Python library and Home Assistant integration are sufficient to design and implement a Homey app.

For a first release, the best path is:

- port authentication carefully
- build a polling-based EV integration first
- normalize the API into a stable internal model
- expose only the most reliable capabilities and actions
- add MQTT and S-PIN-protected operations later

That approach gives you the highest chance of getting a usable Škoda Elroq Homey app running without overcommitting to the most fragile parts on day one.
