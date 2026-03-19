# 🎉 Inguru

> **"Inguru"** means *"around / nearby"* in Basque.

Inguru is a mobile-first progressive web app that shows you **what's happening around you, right now**, during a local festival. Built for the Fêtes de Bayonne, it's fully generic and can host any festival with just three JSON files.

---

## ✨ Features

- 🗺️ **OpenStreetMap** — 100% free, zero API key required
- ▶️ **2-line smart markers** — short event name + live countdown (`in 42min` / `in 2h30` / `Mon. at 8:30pm` / `dd/MM at HH:mm`)
- 🔴 **Animated LIVE dot** on currently running events
- 🚫 **Past events auto-hidden** — only present and future events appear on the map
- 📍 **Floating locate button (FAB)** — bottom-right, re-centers on your position, requests permission if needed
- 💬 **Liquid Glass popup** on marker tap:
  - Mobile: slides up from the bottom, max 50% screen height, internal scroll
  - Desktop: centered on screen, min 25vw width, internal scroll
  - Shows: title, time range, status badge, live countdown, tags, description, walking distance, today's schedule
  - **🗺️ Go there** button → opens Google Maps link from `venues.json`
  - **💬 Tell my friends** button → Web Share API (WhatsApp, SMS…) with a pre-filled message and nav link
- 🌐 **Trilingual FR / ES / EU** — language picker in the header, all translations inline (no network fetch)
- 🎨 **Per-festival dual-color theme** — primary/secondary colors injected as CSS variables from `data/index.json`
- 🎪 **Festival switcher** — dropdown with color-coded cards, status badges, and automatic map flyTo on selection
- 📴 **Installable PWA** with offline cache via Service Worker

---

## 🚀 Quick start

```bash
git clone https://github.com/YOUR_USER/inguru.git
cd inguru
python3 -m http.server 8080
```

Open `http://localhost:8080`. Always use the **same origin** to avoid Service Worker conflicts.

> ⚠️ Geolocation requires HTTPS or `localhost`. GitHub Pages provides HTTPS automatically.

### Stuck on the loading screen?

1. DevTools → **Application → Service Workers → Unregister** all
2. **Application → Storage → Clear site data**
3. Reload

---

## 📁 Project structure

```
inguru/
├── index.html                    # Single-page app entry point
├── manifest.json                 # PWA manifest
├── sw.js                         # Service Worker (offline cache)
│
├── assets/
│   ├── css/main.css              # Liquid Glass design system, mobile-first
│   └── js/
│       ├── app.js                # Bootstrap, festival picker, popup, FAB, i18n
│       ├── map.js                # Leaflet map, 2-line markers, smooth zoom
│       ├── events.js             # Data loading and event filtering
│       ├── time.js               # Status logic, countdowns (ISO 8601)
│       ├── i18n.js               # FR/ES/EU translations inline — zero fetch
│       └── utils.js              # Haversine, formatting, Maps links
│
└── data/
    ├── index.json                # List of all festivals
    └── festivals/
        ├── bayonne-2026/
        │   ├── festival.json
        │   ├── venues.json       # Venues with GPS coords + "go" Maps link
        │   └── events.json       # Schedule with ISO timestamps + shortName
        └── _template/            # Empty template to add a new festival
```

---

## ➕ Adding a new festival

1. Copy `data/festivals/_template/` → `data/festivals/MY-FESTIVAL-YEAR/`
2. Fill in the three JSON files (see formats below)
3. Add an entry to `data/index.json`

The active festival is **selected automatically** based on today's date.

---

## 🗂️ Data formats

### `data/index.json`
```json
{
  "festivals": [
    {
      "id": "bayonne-2026",
      "name": { "fr": "Fêtes de Bayonne", "es": "Fiestas de Bayona", "eu": "Baionako Festak" },
      "city": "Bayonne",
      "dates": { "start": "2026-07-29", "end": "2026-08-02" },
      "center": { "lat": 43.4929, "lng": -1.4748 },
      "theme": { "primary": "#e63012", "secondary": "#ffffff" },
      "emoji": "🐄"
    }
  ]
}
```

### `venues.json`
```json
[
  {
    "id": "place-liberte",
    "name": { "fr": "Place de la Liberté", "es": "Plaza de la Libertad", "eu": "Askatasun Plaza" },
    "coords": { "lat": 43.4927, "lng": -1.4743 },
    "type": "place",
    "address": "Place de la Liberté, Bayonne",
    "go": "https://maps.app.goo.gl/XXXXXXX"
  }
]
```

> **`go`** — Google Maps URL for the venue, used by the "Go there" button and the share message.

### `events.json`
```json
[
  {
    "id": "evt-001",
    "city_id": "bayonne-2026",
    "venueId": "place-liberte",
    "shortName": "Opening ceremony",
    "startTimestamp": "2026-07-29T18:00:00+02:00",
    "endTimestamp":   "2026-07-29T19:30:00+02:00",
    "title": {
      "fr": "Ouverture officielle – Lâcher de vaches",
      "es": "Apertura oficial – Suelta de vacas",
      "eu": "Irekiera ofiziala – Behiak askatzea"
    },
    "description": {
      "fr": "La vache landaise fait son entrée…",
      "es": "La vaca landesa hace su entrada…",
      "eu": "Landako behia hasten du…"
    },
    "tags": ["gratuit", "tradition"]
  }
]
```

> **`shortName`** — display name on the map bubble, max 18 characters.  
> **`startTimestamp` / `endTimestamp`** — ISO 8601 with timezone offset (e.g. `+02:00` for French summer time).

---

## 🌐 Deploy to GitHub Pages

1. `Settings` → `Pages` → Source: `GitHub Actions`
2. Push to `main` → auto-deploy via `.github/workflows/deploy.yml`
3. Live at: `https://YOUR_USER.github.io/inguru/`

---

## 🛠️ Tech stack

| Layer | Solution | Cost |
|---|---|---|
| Map | Leaflet.js + OpenStreetMap | **Free** |
| Distance | Haversine formula (as the crow flies) | **Free** |
| Navigation | Google Maps / Apple Maps deep link | **Free** |
| Hosting | GitHub Pages | **Free** |
| Data | Static JSON files | **Free** |
| Geolocation | `navigator.geolocation` Web API | **Free** |
| Translations | Inline in `i18n.js` | **Free** |

**Total infrastructure cost: €0**

---

## 📱 Responsive behavior

| Context | Event popup | Notes |
|---|---|---|
| Mobile portrait | Slides up, bottom half of screen, internal scroll | FAB 📍 fixed bottom-right |
| Mobile landscape | Same, max 50vh | Compact header |
| Tablet / Desktop | Centered, min 25vw, internal scroll, no arrow | 4–5 column festival grid |

---

## 🗓️ Roadmap

**v1 — current**
- [x] Leaflet map with live 2-line countdown markers
- [x] Liquid Glass popup (mobile bottom sheet / desktop centered)
- [x] Go there + Tell my friends (Web Share API)
- [x] Locate FAB with permission request
- [x] FR / ES / EU inline i18n
- [x] Per-festival dual-color theming
- [x] PWA + offline cache
- [x] Auto-hide past events

**v2**
- [ ] Filters by type, free/paid
- [ ] Favorites (localStorage)
- [ ] Real walking directions via OSRM (free, open source)
- [ ] Push notifications ("starts in 15 min")

**v3**
- [ ] Auto-scraping of official festival schedules
- [ ] Lightweight backend for real-time updates
- [ ] Community error reporting

---

## 📄 License

MIT — free to use, modify, and redistribute.