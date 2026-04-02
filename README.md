# Garden OS — Precision Horticulture Dashboard
### A Cloud-Synced, API-Driven Management System for High-Yield Urban Gardening

![Status](https://img.shields.io/badge/Status-Production--Ready-success)
![Platform](https://img.shields.io/badge/Platform-Web%20%2B%20Mobile-blue)
![Dependencies](https://img.shields.io/badge/Dependencies-None%20(client--side)-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

Garden OS is a single-page application (SPA) built to manage a 4' × 12' vegetable plot for a community garden plot. It solves a specific problem: multiple people managing the same garden plot from different devices — phones in the field, desktops at home — without their data colliding or overwriting each other.

The application combines real-time local weather telemetry, a persistent cloud state engine, and a visual plot blueprint into a single HTML file that works as well on an iPhone in direct sunlight as it does on a desktop browser.

---

## How It Was Built

### The Problem It Solves

Managing a shared garden plot across multiple devices and users creates a classic distributed state problem. If two people open the app simultaneously — one on a phone standing in the garden, one on a laptop at home — and both make changes, a naive save would silently overwrite one person's work. Garden OS was built to handle this correctly.

The second problem was environmental awareness. A garden manager checking the app should immediately know whether there is a frost risk tonight or dangerously high winds forecasted — information that changes watering and covering decisions. Pulling that from a phone's weather app separately is friction. Garden OS eliminates that friction by pulling hyper-local weather data automatically.

### Architecture: Three Services, One File

The application was deliberately built as a single HTML file with no build step, no framework, and no dependencies. This keeps it maximally portable — it can be opened directly in a browser, deployed to a CDN, or saved to a phone's home screen as a Progressive Web App.

Three external services are orchestrated:

**1. OpenWeatherMap API (Telemetry)**

Weather data is fetched on page load from the OpenWeatherMap One Call 3.0 API, targeting the GPS coordinates of the garden location. The app pulls current temperature, wind speed, precipitation, and overnight forecast data. This feeds two alert conditions evaluated in real time:

- **Frost Alert**: triggered when overnight low temperatures are forecast at or below 36°F — a threshold chosen for leafy vegetables that can suffer cold damage before a true frost
- **Wind Alert**: triggered when gusts exceed 30 mph — critical for trellis-supported crops like cucumbers and climbing beans

When either alert is active, the weather bar in the header switches to a pulsing red state, making it immediately visible without reading numbers.

**2. JSONBin.io (State Persistence)**

All persistent state — watering logs, harvest records, user notes, last-modified timestamps — is stored in a JSONBin.io NoSQL bin. This acts as a global source of truth that any device can read from and write to over HTTPS. The app reads state on load and writes on user action.

**3. Netlify (Deployment)**

The application is deployed via Netlify's global CDN for fast load times and automatic HTTPS, which is required for the secure API calls. The single-file architecture makes deployment trivial — drop the HTML file and Netlify handles the rest.

### Conflict-Aware Synchronization

The most technically careful piece of the application is its write-conflict prevention. The mechanism works as follows:

1. When the app loads, it records the current time as `loadedAt` — the session start timestamp
2. When a user triggers a save (logging a watering event, recording a harvest, etc.), the app first makes a `GET` request to JSONBin to fetch the bin's `metadata.createdAt` field — the timestamp of the last write
3. If the server timestamp is newer than `loadedAt`, it means someone else has written data since this session began. The save is aborted and a "Conflict Detected" alert is shown, prompting the user to refresh and sync first
4. If the server timestamp is equal to or older than `loadedAt`, the write proceeds via `PUT`

This is a timestamp handshake pattern — lightweight, stateless, and sufficient for the concurrency level of a two-person garden management scenario. It prevents silent data loss without requiring a WebSocket connection or operational transform algorithm.

### Visual Plot Blueprint

The 4' × 12' plot is rendered as a CSS Grid — 12 columns (each representing one foot of horizontal space) and 4 rows (each representing one foot of depth). Column widths and row heights are defined as CSS custom properties (`--CW: 58px`, `--CH: 85px`) so the grid scales predictably.

The plot is divided into planting zones, each overlaid with a distinct color fill and labeled strip:

- **Spring zone** (columns 1-3): Cool-season crops — spinach, lettuce, radishes
- **Mid-season zone** (columns 4): Transitional space
- **Summer zone** (columns 5-9): Heat-loving crops — tomatoes, peppers, cucumbers
- **Cool/Late zone** (columns 11-12): Second cool-season planting or trellised crops

Each cell in the grid renders the plant emoji, common name, variety, and planting notes for whatever occupies that position. Specialty cell types were built for crops with unique requirements:
- **Tomato cells** include cage identifier, variety name, and a visual indicator for the support structure
- **Pepper cells** show stake label and support line
- **A-frame trellis cells** have a subtle crosshatch background pattern indicating vertical growing space
- **Onion cells** render a 2×2 subgrid showing individual bulb positions

Zone boundaries are marked with colored vertical dividers overlaid on the grid.

### Season Toggle

The app supports two seasonal views — Spring and Summer — toggled by buttons at the top of the grid. The toggle works via a CSS class on the `<body>` element:

- `body.spring` hides elements with class `su-only` (summer-only content)
- `body.summer` hides elements with class `sp-only` (spring-only content)

This allows the same plot layout to show different crops for different seasons without duplicating the HTML structure. A summer-mode hint banner also appears when summer is active, reminding the user of succession planting considerations.

### Harvest Tracker

The right panel of the main view is a harvest tracker that maintains per-plant expected harvest date records. Each plant entry has a date input; once a date is selected, the panel calculates whether harvest is upcoming, due today, or past due — and color-codes the result accordingly (green for on-track, amber for soon, muted for past). The tracker body scrolls independently of the plot blueprint so both panels remain useful simultaneously on larger screens.

### Watering Dashboard

Below the plot, a two-zone watering dashboard provides quick-action buttons for logging watering events:

- **Mist** — light surface watering for seedlings and shallow-rooted crops
- **Soak** — deep watering for established root systems

Each zone (Spring and Summer) has independent watering controls. The last-watered timestamp is stored in JSONBin and displayed with color-coded freshness: green for watered recently, amber for due, and orange for overdue based on days since last watering.

### Plant Reference Table

Below the watering dashboard, a plant schedule table lists every crop in the plot with:

- Transplant or direct-seed date
- Zone assignment
- Expected days to harvest
- Companion planting notes

This serves as a quick reference without requiring the analyst to hover over individual grid cells.

### Mobile Optimization

The layout was built for mobile use in a real outdoor environment. Key mobile considerations:

- **Responsive layout**: On screens narrower than 900px, the blueprint and harvest tracker stack vertically instead of sitting side-by-side
- **Touch scrolling**: The plot blueprint gets horizontal scroll with `-webkit-overflow-scrolling: touch` so the full 12-column grid is accessible via swipe on a phone
- **Minimum plot width**: A CSS `min-width` calculation prevents the grid from collapsing below a readable size on small screens
- **Touch targets**: Season buttons and watering action buttons have `min-height: 44px` and `touch-action: manipulation` for reliable tap registration
- **Tap highlight suppression**: `-webkit-tap-highlight-color: transparent` removes the blue flash on interactive elements
- **Sunlight legibility**: High-contrast color scheme with 1.5px grid lines chosen for visibility in direct outdoor light

### Typography and Visual Design

Three typefaces are loaded from Google Fonts to establish a horticultural aesthetic that's readable and unambiguous outdoors:

| Typeface | Use |
|----------|-----|
| Playfair Display | Section headings, panel titles — elegant serif with horticultural character |
| DM Sans | Body text, notes, general UI — clean and readable at small sizes |
| DM Mono | Labels, badges, timestamps, data values — monospaced for scannable data |

The color palette is built around a soil/bark/sprout theme:

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

- **Live weather bar** — current temperature, humidity, wind, and precipitation for the local area
- **Frost alert** — pulsing red header when overnight temps ≤ 36°F
- **Wind alert** — pulsing red header when gusts exceed 30 mph
- **Visual plot blueprint** — 4' × 12' CSS grid with per-crop cell rendering
- **Zone coloring** — spring, summer, and trellis zones visually differentiated
- **Season toggle** — switch between spring and summer views
- **Harvest tracker** — per-plant harvest date calculator with due/overdue states
- **Watering dashboard** — quick-log Mist and Soak events per zone
- **Overdue watering indicators** — color-coded freshness based on last-watered date
- **Conflict-aware sync** — timestamp handshake prevents multi-device write collisions
- **NoSQL cloud persistence** — JSONBin.io stores all state, accessible from any device
- **Plant reference table** — transplant dates, spacing, days to harvest
- **Growing notes** — seasonal guidance cards for key crops
- **PWA-ready** — Apple mobile web app meta tags for home screen installation
- **Mobile-optimized** — horizontal scroll blueprint, large touch targets, sunlight contrast
- **Zero dependencies** — single HTML file, no npm, no build step

---

## Setup & Configuration

### Requirements

- A **JSONBin.io** account — free tier is sufficient. Create a bin and copy the Master Key.
- An **OpenWeatherMap** account — free tier with One Call 3.0 enabled. Copy the API key.

### Configuration

Open `avon_lake_garden_final.html` in a text editor. Scroll to the `/* ── CONFIG ── */` section near the bottom of the file and fill in your credentials:

```javascript
const BIN_KEY     = 'YOUR_JSONBIN_MASTER_KEY';   // JSONBin Master Key
const WEATHER_KEY = 'YOUR_OPENWEATHERMAP_KEY';   // OpenWeatherMap API key
const LAT         = 'YOUR_LATITUDE';              // Latitude
const LON         = 'YOUR_LONGITUDE';             // Longitude
```

Adjust `LAT` and `LON` if deploying for a different location.

### Running Locally

Open `avon_lake_garden_final.html` directly in any modern browser. Due to browser CORS restrictions on `file://` URLs, the weather and JSONBin API calls may be blocked locally. For full functionality, serve the file over HTTP:

```bash
# Python (built-in)
python3 -m http.server 8080
# Then open http://localhost:8080/avon_lake_garden_final.html
```

### Deploying to Netlify

1. Drag and drop the `avon_lake_garden_final.html` file into the Netlify drop zone at app.netlify.com
2. Netlify assigns a public HTTPS URL automatically
3. Access from any device at that URL — bookmark it or add to iPhone home screen

### Installing on iPhone Home Screen

1. Open the Netlify URL in Safari on iPhone
2. Tap the Share button → **Add to Home Screen**
3. The app installs with the title "My Garden 2026" and opens full-screen without browser chrome

---

## File Structure

```
Garden 2026 Project/
├── avon_lake_garden_final.html   ← Complete application (single file)
└── README.md                     ← This file
```

---

## Limitations

- Weather data is fetched once on page load. Refresh the page to update weather conditions.
- The timestamp handshake conflict detection is designed for two concurrent users. High-frequency simultaneous writes from many users are not supported.
- JSONBin.io free tier has request rate limits. For heavy use, a paid tier or alternative persistence layer is recommended.
- The plot layout (crop placement, varieties, dates) is hardcoded for the 2026 season. To adapt for a different plot or season, the grid HTML in the body must be edited directly.
- OpenWeatherMap One Call 3.0 requires a paid subscription after the free tier request limit is reached.
