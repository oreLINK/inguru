# 🎉 Inguru

> **"Inguru"** signifie *"autour / aux alentours"* en basque.

Inguru est une application web mobile-first qui affiche sur une carte **ce qui se passe autour de toi, maintenant**, pendant une fête locale. Conçue initialement pour les Fêtes de Bayonne, elle est générique et peut accueillir n'importe quel festival.

---

## ✨ Fonctionnalités

- 🗺️ **Carte OpenStreetMap** (100 % gratuit, zéro clé API) avec marqueurs dynamiques
- ▶️ **Bulles 2 lignes** : nom court de l'événement + compte à rebours live (`dans 42min` / `dans 2h30` / `lun. à 20h30` / `dd/MM à HH:mm`)
- 🔴 **Point LIVE animé** sur les événements en cours
- 🚫 **Événements passés masqués** automatiquement — seuls les événements présents ou futurs s'affichent
- 📍 **Bouton FAB flottant** en bas à droite pour recentrer sur sa position (demande la permission si besoin)
- 💬 **Popup Liquid Glass** au clic sur un marqueur :
  - Mobile : occupe la moitié basse de l'écran avec scroll interne
  - Desktop : centré à l'écran, largeur min 25vw, scroll interne
  - Détails complets : titre, horaire, badge statut, countdown, tags, description, distance à vol d'oiseau, programme du jour
  - Bouton **🗺️ Y aller** → ouvre le lien Google Maps depuis `venues.json`
  - Bouton **💬 Prévenir mes potes** → Web Share API (WhatsApp, SMS…) avec message pré-rempli et lien de navigation
- 🌐 **Trilingue FR / ES / EU** — menu déroulant dans le header, traductions inline sans aucun fetch réseau
- 🎨 **Thème bi-chromatique par festival** — couleurs primaire/secondaire injectées en CSS variables depuis `data/index.json`
- 🎪 **Sélecteur de festivals** — menu déroulant avec cartes colorées, badge En cours / À venir / Terminé, flyTo automatique sur le centre-ville au changement
- 📴 **PWA installable** avec cache offline (Service Worker)
- ♻️ **Générique** : ajouter un festival = copier `_template/` et remplir 3 JSON

---

## 🚀 Démarrage rapide

```bash
# Clone
git clone https://github.com/TON_USER/inguru.git
cd inguru

# Serveur local (choisir l'un ou l'autre, pas les deux en même temps)
python3 -m http.server 8080
# ou
npx serve .
```

Ouvrir `http://localhost:8080` — **toujours la même origine** pour éviter les conflits de Service Worker.

> ⚠️ La géolocalisation nécessite HTTPS ou `localhost`. GitHub Pages fournit HTTPS automatiquement.

### En cas d'écran de chargement bloqué

1. DevTools → **Application → Service Workers → Unregister** tous les SW
2. **Application → Storage → Clear site data**
3. Recharger

---

## 📁 Structure du projet

```
inguru/
├── index.html                    # SPA – point d'entrée unique
├── manifest.json                 # PWA
├── sw.js                         # Service Worker (cache offline)
├── README.md
│
├── assets/
│   ├── css/main.css              # Liquid Glass, mobile-first, responsive
│   └── js/
│       ├── app.js                # Bootstrap, festival picker, popup, FAB, langue
│       ├── map.js                # Leaflet – carte, marqueurs 2 lignes, zoom fluide
│       ├── events.js             # Chargement et filtrage des données
│       ├── time.js               # Statuts, countdowns (ISO 8601)
│       ├── i18n.js               # Traductions FR/ES/EU inline (aucun fetch)
│       └── utils.js              # Haversine, formatage, liens Maps
│
└── data/
    ├── index.json                # Liste de tous les festivals
    └── festivals/
        ├── bayonne-2026/
        │   ├── festival.json
        │   ├── venues.json       # Lieux avec coordonnées GPS + champ "go" (lien Maps)
        │   └── events.json       # Programme avec ISO timestamps + shortName
        └── _template/            # Modèle vide pour un nouveau festival
```

---

## ➕ Ajouter un nouveau festival

1. Copier `data/festivals/_template/` → `data/festivals/MON-FESTIVAL-ANNEE/`
2. Remplir les 3 fichiers :
   - `festival.json` → nom (FR/ES/EU), dates, coordonnées GPS, couleurs thème
   - `venues.json` → lieux avec coordonnées GPS et **champ `go`** (lien Google Maps vers le lieu)
   - `events.json` → programme avec **ISO timestamps**, **shortName** (≤ 18 caractères) et traductions
3. Ajouter une entrée dans `data/index.json`

Le festival actif est sélectionné **automatiquement** selon la date du jour.

---

## 🗂️ Format des données

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

> Le champ **`go`** est l'URL Google Maps du lieu, utilisée par le bouton "Y aller" et le message de partage.

### `events.json`
```json
[
  {
    "id": "evt-001",
    "city_id": "bayonne-2026",
    "venueId": "place-liberte",
    "shortName": "Lâcher de vaches",
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

> **`shortName`** : nom court ≤ 18 caractères affiché sur la bulle de la carte.  
> **`startTimestamp` / `endTimestamp`** : ISO 8601 avec timezone (`+02:00` pour l'heure d'été en France).

---

## 🌐 Déploiement GitHub Pages

1. `Settings` → `Pages` → Source : `GitHub Actions`
2. Push sur `main` → déploiement automatique via `.github/workflows/deploy.yml`
3. URL : `https://TON_USER.github.io/inguru/`

---

## 🗺️ Stack technique

| Composant | Solution | Coût |
|---|---|---|
| Carte | Leaflet.js + OpenStreetMap | **Gratuit** |
| Distance | Haversine (vol d'oiseau) | **Gratuit** |
| Itinéraire | Lien Google Maps / Apple Maps | **Gratuit** |
| Hébergement | GitHub Pages | **Gratuit** |
| Données | JSON statiques | **Gratuit** |
| Géoloc | `navigator.geolocation` | **Gratuit** |
| Traductions | Inline dans `i18n.js` | **Gratuit** |

---

## 📱 Comportement responsive

| Contexte | Popup événement | Autres |
|---|---|---|
| Mobile portrait | Moitié basse de l'écran, scroll interne | FAB 📍 fixe bas-droite |
| Mobile paysage | Moitié basse (max 50vh) | Header réduit |
| Tablette / Desktop | Centré à l'écran, min 25vw, scroll interne | Grille festivals 4–5 colonnes |

---

## 🗓️ Roadmap

**v1 (actuelle)**
- [x] Carte Leaflet + marqueurs 2 lignes avec countdown live
- [x] Popup Liquid Glass (mobile bas / desktop centré)
- [x] Bouton Y aller + Prévenir mes potes (Web Share API)
- [x] FAB localisation avec demande de permission
- [x] Trilingue FR/ES/EU inline
- [x] Thème bi-chromatique par festival
- [x] PWA + cache offline
- [x] Masquage automatique des événements passés

**v2**
- [ ] Filtres par type, gratuit/payant
- [ ] Favoris (localStorage)
- [ ] Routing piéton réel via OSRM
- [ ] Notifications push (début dans 15 min)

**v3**
- [ ] Scraping auto du programme officiel
- [ ] Backend léger pour mises à jour en temps réel

---

## 📄 Licence

MIT – Libre d'utilisation, modification et redistribution.