# Garden OS — Precision Horticulture Dashboard
### A Cloud-Synced, PWA Garden Management System for Any Size Plot

![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web%20%2B%20Mobile-blue?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Offline--Ready-blueviolet?style=for-the-badge)
![Sync](https://img.shields.io/badge/Sync-Real--Time%20Cloud-informational?style=for-the-badge)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## Overview

Garden OS is a Progressive Web App (PWA) built to manage vegetable garden plots of any size from a small 2×2 raised bed up to a 20×20 in-ground plot. Multiple beds are supported simultaneously, each independently sized and named. It solves a specific problem: multiple people managing the same garden from different devices — phones in the field, desktops at home — without their data colliding or overwriting each other.

The application combines real-time local weather telemetry, a persistent cloud state engine, companion planting intelligence, harvest tracking, and a visual plot blueprint — all in a small set of static files with no framework, no build step, and no dependencies.

---

## How It Was Built

### The Problem It Solves

Managing a shared garden plot across multiple devices creates a classic distributed state problem. If two people open the app simultaneously and both make changes, a naive save would silently overwrite one person's work. Garden OS handles this correctly with a timestamp handshake conflict detection system.

The second problem was environmental awareness — a garden manager should immediately know whether there is a frost risk tonight, dangerous winds forecasted, or enough rain to skip watering. Garden OS eliminates that friction by pulling hyper-local weather data automatically and sending push notifications even when the app is closed.

### Architecture: Three Services, Four Files

The application is built as a small set of static files with no build step and no framework. This keeps it maximally portable — deployable to any CDN or saved to a phone's home screen as a PWA.

**Files:**
| File | Purpose |
|------|---------|
| `index.html` | The entire application — UI, logic, state, styles |
| `sw.js` | Service worker — caches the app for offline use |
| `manifest.json` | PWA manifest — name, colors, icons, display mode |
| `icon.svg` | App icon — garden-themed SVG for home screen |

**Three external services are orchestrated:**

**1. OpenWeatherMap API (Telemetry)**

Weather data is fetched on page load and auto-refreshes every 15 minutes. The app pulls current temperature, wind speed, precipitation, and overnight forecast data, feeding three real-time alert conditions:

- **Frost Alert** — triggered when overnight lows are forecast at or below 36°F (ice-blue pulsing bar)
- **Wind Alert** — triggered when gusts exceed 30 mph (red pulsing bar)
- **Rain Alert** — triggered when current conditions include rain or recent precipitation exceeds 0.1 inch (dark blue bar, "Skip Watering" message)

When an alert is active, the weather bar switches to a pulsing colored state. Browser push notifications fire at 6 PM daily when alerts are enabled, even when the app is closed. Priority: wind/severe overrides frost, frost overrides rain.

**2. JSONBin.io (State Persistence)**

All persistent state — plant layouts, watering logs, harvest records, bed configurations — is stored in a JSONBin.io NoSQL bin. This acts as a global source of truth readable and writable from any device over HTTPS.

A **sync code** UI is built into the harvest tracker panel. After first load, the app displays your bin ID as a copyable sync code. Paste that code into any other device to connect it to the same cloud record — no account creation needed on the second device.

**3. Netlify (Deployment)**

The application is deployed via Netlify's global CDN for fast load times and automatic HTTPS, required for service worker registration and API calls.

### Conflict-Aware Synchronization

The write-conflict prevention mechanism works as follows:

1. On load, the app records the `_savedAt` timestamp embedded in the cloud record as `loadedAt`
2. On save, the app first GETs the latest record and reads its `_savedAt` value
3. If `server._savedAt > loadedAt`, someone else saved since this session began — the save is blocked and the user is prompted to refresh
4. If no conflict, the PUT proceeds and `loadedAt` is updated to the new `_savedAt`

This is a lightweight timestamp handshake sufficient for a two-person garden management scenario, with no WebSocket or operational transform required.

> **Note:** The conflict check reads `_savedAt` embedded inside the record data itself — not JSONBin's `metadata.createdAt`, which is set once at bin creation and never changes on PUT updates.

### Offline Write Queue

If a save fails because the device is offline, the payload is stored in `localStorage` under a pending write key. The moment the browser comes back online, the queued write is automatically flushed to JSONBin. A sticky red banner at the top of the page indicates offline status in real time.

### Visual Plot Blueprint

The plot is rendered as a CSS Grid — columns represent feet of horizontal space, rows represent feet of depth. Column widths and row heights are defined as CSS custom properties so the grid scales predictably across screen sizes (cells shrink to 48px on mobile).

The grid is fully data-driven — no hardcoded HTML for plant cells. All plants are stored in a `plants` array per bed and rendered by `renderGrid()` on every state change.

Three named zones are marked by colored fills and a labeled zone strip beneath the grid:
- **Spring / Succession zone** — cols 1–3 (cool-season crops → summer succession)
- **Summer Staples zone** — cols 5–9 (tomatoes, peppers, onions)
- **Trellis / Trailing zone** — cols 11–12 (A-frame, cucumbers, squash)

Specialty cell types handle crops with unique display requirements:
- **Tomato cells** — cage identifier, variety name, SVG cage graphic
- **Pepper cells** — stake label, support line indicator
- **A-frame trellis cells** — crosshatch background, ridge label, directional plant icons (SVG pea and cucumber graphics)
- **Onion cells** — 2×2 subgrid showing individual bulb positions (hand-drawn SVG for red onion)
- **Squash cells** — side-by-side dual-plant layout (hand-drawn SVG for yellow squash)
- **Radish cells** — 2×2 grid of hand-drawn SVG radish graphics
- **Kale cells** — custom SVG leaf illustration

### Dynamic Plant Management

Every cell in the grid has a hover-reveal edit button. Clicking it opens a modal where the plant's name, variety, emoji, and season can be changed. A 100-entry searchable plant database provides auto-fill defaults — selecting a plant from the database populates emoji, spacing, days to harvest, and growing notes automatically.

### Multi-Bed Support

The app supports multiple garden beds with a tab switcher. Each bed has independently configurable dimensions — any size from 2×1 up to 20×20, where each column and row represents one foot. The grid, zone strip, column headers, and dimension label all update dynamically when a bed is resized or switched. There is no fixed plot size — the grid generates entirely from the configured dimensions.

### Companion Planting Intelligence

After every `renderGrid()` call, a companion planting analysis runs against the active layout:

- A compatibility matrix of 30+ plant keys defines good and bad neighbor pairs
- Each plant is checked against all adjacent cells (including diagonals and multi-cell spans)
- Cells with good neighbors get a small green ✓ badge; cells with bad neighbors get a red ✕ badge
- A collapsible panel below the zone strip shows the full analysis with horticultural notes for each detected pair (e.g. *"Onions deter aphids and other tomato pests"*)
- The analysis re-runs automatically when the season is toggled or any plant is edited

### Planting Date & Harvest Window Tracker

A panel fixed to the right side of the grid (stacked below it on mobile) lets you enter planting dates for each crop. The app calculates an estimated harvest window using each crop's days-to-maturity range and displays:

- The harvest window as a date range (e.g. "Jul 12 – Jul 27")
- A countdown badge ("42 days until harvest window")
- Color-coded status: green (upcoming), amber (within 14 days), dimmed (season passed)
- Confirmation prompt if you change an already-set date
- "Clear All Dates" button with a destructive-action warning

The tracker respects the active season — spring-only crops (radishes, spinach, snap peas) show in Spring view; summer-only crops show in Summer view.

### Season History & Compare

Any layout snapshot can be archived with a single tap:

- Archives store the full plant layout, harvest log, bed configuration, and metadata
- Up to 20 archives are stored in `localStorage`
- The Season History card at the bottom of the page lists all archives
- Clicking **Compare** on any archive opens a modal showing the diff against the current live layout — new plants (green), removed plants (red), and unchanged plants — plus a harvest totals comparison

### Harvest Logging & Yield Tracking

A dedicated harvest log section allows logging individual harvests with plant name, emoji, date, quantity, unit, and notes. The log maintains:

- Running yield totals grouped by plant with emoji and a proportional bar chart
- A scrollable history table sorted newest first
- CSV export of the full season's harvest data
- Emoji auto-fill when a plant name matches the database or active grid

### Season Toggle

Two seasonal views — Spring and Summer — are toggled by buttons at the top of the grid. The toggle works via a CSS class on `<body>`:

- `body.spring` hides `.su-only` elements
- `body.summer` hides `.sp-only` elements

The companion planting analysis and harvest plant autocomplete both respond to the active season automatically. The active season is persisted in `localStorage` and restored on next load.

### Watering Dashboard

A two-zone watering dashboard below the plot provides quick-action buttons for logging Mist and Soak events per zone:

- **Spring zone** — Surface Mist for radishes, spinach, kale, onions
- **Summer zone** — Deep Soak for tomatoes, peppers, cucumbers, squash

Last-watered timestamps are stored in JSONBin and displayed with color-coded freshness: green (recent), amber (due), orange (overdue). The display refreshes every 60 seconds automatically.

### Static Reference Sections

Below the interactive dashboard, the app includes three static reference sections:

- **Plant Reference table** — full planting guide with season, zone, plants per square foot, total seed/plant counts, and timing for every crop in the layout
- **Game Plan cards** — four-step bed preparation checklist (clear, loosen, amend, grid) before the season starts
- **Notes callout cards** — quick-reference guidance on last frost date, infrastructure-first rule, A-frame trellis split, and season toggle explanation

### Callout Bar

A fixed bar at the top of the card (hidden on mobile to save vertical space) shows at-a-glance garden facts: sun exposure, safe transplant date reminder, water spigot location, soil prep notes, and the infrastructure-first reminder.

### Mobile Optimization

The layout is built for real outdoor use on a phone:

- **Horizontal scroll** — the blueprint scrolls left-right on mobile with `display: block` on the scroll container and `overscroll-behavior-x: contain` to prevent the page from stealing the gesture
- **Smaller cells on mobile** — `--CW` drops from 58px to 48px on screens under 900px, reducing total scroll distance
- **GPU compositing** — `box-shadow: inset` replaces dashed borders inside scroll GPU layers to prevent border disappearance on iOS
- **Stacked layout** — blueprint and harvest tracker stack vertically below 900px
- **Large touch targets** — season and watering buttons have `min-height: 40px` and `touch-action: manipulation`
- **Sunlight contrast** — high-contrast color scheme with 1.5px grid lines for outdoor legibility

### Progressive Web App

- **Service worker** — pre-caches `index.html` on install; uses network-first strategy with cache fallback
- **Manifest** — full `manifest.json` with name, theme color, display mode, and SVG icon
- **Install prompt** — "Install App" button appears automatically on Android/Chrome via `beforeinstallprompt`
- **iOS home screen** — Apple PWA meta tags enable full-screen standalone mode when added via Safari Share → Add to Home Screen
- **Offline banner** — sticky red strip appears when connectivity drops, disappears on reconnect

### Typography and Visual Design

| Typeface | Use |
|----------|-----|
| Playfair Display | Section headings, panel titles |
| DM Sans | Body text, notes, general UI |
| DM Mono | Labels, badges, timestamps, data values |

Color palette built around a soil/bark/sprout theme:

| Token | Hex | Meaning |
|-------|-----|---------|
| `--soil` | `#2C1A0E` | App background — dark soil brown |
| `--bark` | `#3A2210` | Card surface — tree bark brown |
| `--moss` | `#3D5A2C` | Section accents — moss green |
| `--sprout` | `#8AB55A` | Success states, spring zones |
| `--cream` | `#F5EDD8` | Primary text — warm off-white |
| `--gold` | `#C8923A` | Borders, highlights, gold accents |
| `--sky` | `#4A7FA8` | Trellis zones, water-related UI |

---

## Features

- **Live weather bar** — temperature, humidity, wind, and precipitation; auto-refreshes every 15 minutes
- **Frost & wind alerts** — pulsing red header + push notifications at 6 PM
- **Rain alert** — pulsing dark blue header; "Skip Watering" message when rain detected
- **Visual plot blueprint** — CSS Grid with per-crop specialty cell rendering and custom SVG plant graphics
- **Three-zone layout** — Spring/Succession, Summer Staples, and Trellis/Trailing zones with visual fills
- **Dynamic plant management** — edit any cell in the UI, no code changes needed
- **100-entry plant database** — searchable, auto-fills defaults on selection
- **Multi-bed support** — add beds, resize up to 20×20, tab switcher
- **Companion planting intelligence** — cell badges + collapsible analysis panel with notes
- **Planting date tracker** — enter transplant dates per crop, see estimated harvest window with countdown
- **Season history & compare** — archive layouts, diff against current, harvest comparison
- **Harvest logging** — per-entry log with totals, proportional bar charts, emoji, and CSV export
- **Season toggle** — Spring / Summer views with per-plant season assignment, persisted in localStorage
- **Watering dashboard** — Mist and Soak logging per zone with color-coded freshness, auto-refreshes every minute
- **Conflict-aware sync** — timestamp handshake blocks multi-device write collisions
- **Sync code** — copy/paste your cloud bin ID to connect any new device instantly
- **Offline write queue** — saves queue locally when offline, auto-sync on reconnect
- **JSONBin.io cloud persistence** — all state synced across devices
- **Static reference sections** — plant reference table, game plan cards, and notes callouts
- **Progressive Web App** — service worker, manifest, install prompt, offline mode
- **Mobile horizontal scroll** — correct `display: block` scroll container with iOS-safe GPU compositing
- **Zero dependencies** — no npm, no framework, no build step

---

## Setup & Configuration

### Requirements

- A **JSONBin.io** account — free tier is sufficient. Copy the Master Key from the API Keys page.
- An **OpenWeatherMap** account — free tier. Copy the API key.

### Configuration

Open `index.html` in a text editor and find the three configuration values:

**Weather (around line 914):**
```javascript
var OWM = 'YOUR_OPENWEATHERMAP_API_KEY'; // OpenWeatherMap API key
var ZIP = 'YOUR_ZIP_CODE';               // e.g. '10001'
```

**Weather bar location label (around line 949):**
```javascript
bar.appendChild(wbItem('Your City, ST', temp+'°F', 'feels '+feels+'°F'));
```
Update the location string to match your garden's city and state.

**Cloud sync (around line 980):**
```javascript
var API_KEY = 'YOUR_JSONBIN_API_KEY'; // JSONBin Master Key
```

The JSONBin bin ID is created automatically on first load and stored in `localStorage` — no manual bin setup needed. Weather is fetched for the zip code provided.

### Running Locally

Due to browser CORS restrictions on `file://` URLs, serve the files over HTTP for full functionality:

```bash
# Python (built-in)
python3 -m http.server 8080
# Then open http://localhost:8080
```

### Deploying to Netlify

1. Go to **app.netlify.com/drop**
2. Drag the entire project folder in — all four files must be in the same directory
3. Netlify assigns a public HTTPS URL automatically
4. Access from any device, bookmark it, or add to iPhone home screen

> All four files (`index.html`, `sw.js`, `manifest.json`, `icon.svg`) must be deployed together in the same directory for the service worker and manifest to resolve correctly.

### Installing on iPhone Home Screen

1. Open the Netlify URL in Safari on iPhone
2. Tap the Share button → **Add to Home Screen**
3. The app installs as a standalone PWA titled "My Garden 2026"

---

## Limitations

- Weather auto-refreshes every 15 minutes. Pull-to-refresh is not implemented — reload the page to force an immediate update outside the refresh cycle.
- Push notifications require the app to be open or installed as a PWA. iOS Web Push requires iOS 16.4+ with the app added to the home screen.
- The timestamp handshake conflict detection is designed for two concurrent users. High-frequency simultaneous writes from many users are not supported.
- JSONBin.io free tier has request rate limits. For heavy use, a paid tier or alternative persistence layer is recommended.
- Season history archives are stored in `localStorage` — they are device-local and not synced to JSONBin.
- OpenWeatherMap One Call 3.0 requires a paid subscription after the free tier request limit is reached.
