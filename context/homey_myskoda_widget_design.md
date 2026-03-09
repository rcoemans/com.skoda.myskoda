# MyŠkoda Homey App – Widget Design Guide

This document describes how to design and implement Homey dashboard widgets for the **MyŠkoda Homey app**.  
It includes widget sizes, recommended patterns, example layouts, widget architecture, and the recommended SVG icon strategy.

---

# 1. Widget Sizes in Homey

Homey dashboards support multiple widget sizes. You do **not need to implement all sizes**, but supporting several improves usability.

| Size | Grid | Typical usage |
|-----|-----|---------------|
| Small | 1×1 | Single value |
| Medium | 2×1 | Status summary |
| Large | 2×2 | Detailed controls |

## Recommended Setup for the MyŠkoda App

| Widget | Purpose |
|------|---------|
| Small | Battery level |
| Medium | Charging status |
| Large | Full vehicle dashboard |

Example `widget.json`:

```json
{
  "id": "vehicle-status",
  "title": {
    "en": "Vehicle Status"
  },
  "sizes": ["small", "medium", "large"]
}
```

---

# 2. Design Patterns

Homey widgets typically follow a few design patterns.

## Value Widget

Displays a single metric.

Example:

Battery  
72%

## Status Widget

Displays multiple vehicle properties.

Example:

Car  
Charging  
⚡ 72%

## Control Widget

Allows actions.

Example:

Climate  
[ Start ]

## Dashboard Widget

Displays several values and controls.

Example:

Škoda Elroq  
Battery 72%  
Range 390 km  
Charging: Yes  
[ Start Climate ]

---

# 3. Widget Folder Structure

Widgets live inside the Homey app repository.

```text
/widgets
   /vehicle-status
      widget.json
      widget.html
      widget.js
      widget.css
```

Example:

```text
my-skoda-app
 ├─ widgets
 │   └─ vehicle
 │       ├─ widget.json
 │       ├─ widget.html
 │       ├─ widget.js
 │       └─ widget.css
```

A shared icon folder is recommended:

```text
/assets
   /icons
      battery-0.svg
      battery-1.svg
      battery-2.svg
      battery-3.svg
      battery-4.svg
      battery-5.svg
      charging.svg
      plug.svg
      climate.svg
      lock.svg
      unlock.svg
      location.svg
      car.svg
      range.svg
      temperature.svg
```

---

# 4. Suggested Widgets for the MyŠkoda App

## 1. Small Widget – Battery

Purpose:
- Show vehicle battery level

Example:

🔋  
72%

## 2. Medium Widget – Charging Status

Purpose:
- Show charging state
- Show battery level
- Show range

Example:

Škoda Elroq  
Charging ⚡  
Battery 72%  
Range 385 km

## 3. Large Widget – Vehicle Dashboard

Purpose:
- Show complete vehicle status
- Provide quick controls

Example:

Škoda Elroq  

🔋 Battery 72%  
⚡ Charging  
📍 Home  

[ Start climate ]  
[ Stop charging ]

---

# 5. Widget Data Source

Widgets typically read from **Homey device capabilities**.

Example capabilities:

- `measure_battery`
- `measure_range`
- `charging_state`
- `car_locked`
- `climate_active`

Example widget JS:

```javascript
const device = await Homey.devices.getDevice({ id: args.deviceId });
const battery = device.capabilitiesObj.measure_battery.value;
```

---

# 6. Useful Widgets for a Car Integration

Recommended widgets:

### Battery Widget
Displays:
- Battery percentage
- Remaining range

### Charging Widget
Displays:
- Charging status
- Charge limit
- Start/stop charging

### Climate Widget
Displays:
- Cabin temperature
- Climate active status

### Vehicle Status Widget
Displays:
- Lock state
- Plug state
- Last update

---

# 7. UI Design Guidelines

Recommended:

- Simple typography
- Large numbers
- Minimal icons
- Works in dark and light mode

Avoid:

- Overly complex layouts
- Too many buttons
- Small unreadable text

---

# 8. Example Layout (Large Widget)

```text
┌────────────────────┐
  Škoda Elroq

  🔋 72%    ⚡ Charging
  Range 385 km

  Cabin 21°C

  [ Start Climate ]
  [ Stop Charging ]

  Updated 2 min ago
└────────────────────┘
```

---

# 9. SVG Icon Strategy

For this app, use **state-based SVG icons** with lowercase filenames.

## Recommended battery icon set

Use six battery icons:

- `battery-0.svg`
- `battery-1.svg`
- `battery-2.svg`
- `battery-3.svg`
- `battery-4.svg`
- `battery-5.svg`

Suggested mapping:

| Icon | Battery level |
|------|---------------|
| `battery-0.svg` | 0–10% |
| `battery-1.svg` | 11–25% |
| `battery-2.svg` | 26–40% |
| `battery-3.svg` | 41–60% |
| `battery-4.svg` | 61–80% |
| `battery-5.svg` | 81–100% |

Example logic:

```javascript
function getBatteryIcon(level) {
  if (level <= 10) return "battery-0.svg";
  if (level <= 25) return "battery-1.svg";
  if (level <= 40) return "battery-2.svg";
  if (level <= 60) return "battery-3.svg";
  if (level <= 80) return "battery-4.svg";
  return "battery-5.svg";
}
```

## Other recommended icons

Use lowercase filenames for all icons:

- `charging.svg`
- `plug.svg`
- `climate.svg`
- `lock.svg`
- `unlock.svg`
- `location.svg`
- `car.svg`
- `range.svg`
- `temperature.svg`

## Why lowercase matters

Homey apps run in a Linux environment, which is case-sensitive.  
Using lowercase filenames avoids path and deployment issues.

## SVG styling recommendation

For best compatibility with Homey themes, use:

```svg
stroke="currentColor"
fill="none"
```

This lets icons adapt better to widget styling and light/dark modes.

---

# 10. Battery + Charging Overlay Pattern

A useful enhancement is to overlay a charging symbol on top of the battery icon when the vehicle is charging.

Example structure:

```html
<div class="battery">
  <img src="/assets/icons/battery-4.svg" alt="Battery icon">
  <img class="charging-overlay" src="/assets/icons/charging.svg" alt="Charging icon">
</div>
```

Example CSS:

```css
.battery {
  position: relative;
  width: 32px;
  height: 32px;
}

.battery img {
  width: 100%;
  height: 100%;
}

.charging-overlay {
  position: absolute;
  right: -2px;
  top: -2px;
  width: 12px !important;
  height: 12px !important;
}
```

This works well in medium and large widgets.

---

# 11. Recommended Implementation Strategy

Start simple.

## Phase 1

Implement:
- Small battery widget
- Medium vehicle status widget

## Phase 2

Add:
- Charging control widget
- Climate control widget

## Phase 3

Add:
- Full dashboard widget
- Advanced vehicle controls

---

# 12. Conclusion

Homey widgets allow users to quickly view and control their vehicle without opening the app.

For the **MyŠkoda Homey integration**, the most useful widgets are:

1. Battery widget
2. Vehicle status widget
3. Charging control widget
4. Climate control widget

For icons, use:
- a six-level battery set from `battery-0.svg` to `battery-5.svg`
- lowercase filenames for all SVG assets
- monochrome transparent SVGs using `currentColor`

Start with small and medium widgets, then add larger dashboard widgets later.
