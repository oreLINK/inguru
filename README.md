# 🎉 Inguru

> **"Inguru"** signifie *"autour / aux alentours"* en basque.

Inguru est une application web mobile-first qui affiche sur une carte **ce qui se passe autour de toi, maintenant**, pendant une fête locale. Conçue initialement pour les Fêtes de Bayonne, elle est générique et peut accueillir n'importe quel festival.

## ✨ Fonctionnalités

- 🗺️ **Carte OpenStreetMap** (100 % gratuit, zéro clé API) avec marqueurs des lieux
- ▶️ **Événement en cours ou prochain** par lieu, avec countdown en temps réel
- 🚶 **Distance à vol d'oiseau** + temps de marche estimé depuis ta position
- ↗️ **Lien itinéraire** vers Google Maps / Apple Maps (lien web, gratuit)
- 🌐 **Trilingue** : Français · Español · Euskara
- 📴 **PWA installable** avec cache offline (Service Worker)
- ♻️ **Générique** : ajouter un festival = copier `_template/` et remplir 3 JSON

## 🚀 Démarrage rapide

```bash
# Clone
git clone https://github.com/TON_USER/inguru.git
cd inguru

# Sers localement (Python ou Node)
python3 -m http.server 8080
# ou
npx serve .
```

Ouvre `http://localhost:8080` sur mobile ou en DevTools mode responsive.

> ⚠️ La géolocalisation nécessite HTTPS ou `localhost`. GitHub Pages fournit HTTPS automatiquement.

## 📁 Structure du projet

```
inguru/
├── index.html              # SPA – point d'entrée unique
├── manifest.json           # PWA
├── sw.js                   # Service Worker (cache offline)
│
├── assets/
│   ├── css/main.css        # Thème sombre, mobile-first
│   └── js/
│       ├── app.js          # Bootstrap principal, géoloc, UI
│       ├── map.js          # Leaflet – carte et marqueurs
│       ├── events.js       # Chargement et filtrage des données
│       ├── time.js         # Statut événements, countdown
│       ├── i18n.js         # Traductions
│       └── utils.js        # Haversine, formatage, liens Maps
│
├── locales/
│   ├── fr.json             # Français
│   ├── es.json             # Español
│   └── eu.json             # Euskara
│
└── data/
    ├── index.json          # Liste des festivals disponibles
    └── festivals/
        ├── bayonne-2025/   # Données Fêtes de Bayonne 2025
        │   ├── festival.json
        │   ├── venues.json
        │   └── events.json
        └── _template/      # Modèle vide pour un nouveau festival
```

## ➕ Ajouter un nouveau festival

1. Copie `data/festivals/_template/` → `data/festivals/MON-FESTIVAL-ANNEE/`
2. Remplis les 3 fichiers JSON :
   - `festival.json` → nom, dates, coordonnées GPS du centre, couleur thème
   - `venues.json` → liste des lieux avec coordonnées GPS
   - `events.json` → programme complet (date, heure début/fin, lieu, titre, description)
3. Ajoute une entrée dans `data/index.json`

Le festival actif est sélectionné **automatiquement** selon la date du jour.

## 🗂️ Format des données

### `data/index.json`
```json
{
  "festivals": [
    { "id": "bayonne-2025", "dates": { "start": "2025-07-30", "end": "2025-08-03" } }
  ]
}
```

### `venues.json` (extrait)
```json
[
  {
    "id": "place-liberte",
    "name": { "fr": "Place de la Liberté", "es": "Plaza de la Libertad", "eu": "Askatasun Plaza" },
    "coords": { "lat": 43.4927, "lng": -1.4743 },
    "type": "place",
    "address": "Place de la Liberté, Bayonne"
  }
]
```

### `events.json` (extrait)
```json
[
  {
    "id": "evt-001",
    "venueId": "place-liberte",
    "date": "2025-07-30",
    "startTime": "21:00",
    "endTime": "23:30",
    "type": "concert",
    "title": { "fr": "Concert d'ouverture", "es": "Concierto de apertura", "eu": "Irekiera kontzertua" },
    "description": { "fr": "...", "es": "...", "eu": "..." },
    "tags": ["gratuit"],
    "free": true
  }
]
```

## 🌐 Déploiement GitHub Pages

1. `Settings` → `Pages` → Source : `GitHub Actions`
2. Push sur `main` → déploiement automatique via `.github/workflows/deploy.yml`
3. URL : `https://TON_USER.github.io/inguru/`

## 🗺️ Stack technique

| Composant | Solution | Coût |
|-----------|----------|------|
| Carte | Leaflet.js + OpenStreetMap | **Gratuit** |
| Routing piéton | Haversine (vol d'oiseau) → OSRM en v2 | **Gratuit** |
| Hébergement | GitHub Pages | **Gratuit** |
| Itinéraire | Lien Google Maps / Apple Maps | **Gratuit** |
| Données | JSON statiques | **Gratuit** |
| Géoloc | `navigator.geolocation` | **Gratuit** |

## 🗓️ Roadmap

**v1 (actuelle)** — Statique, zéro coût
- [x] Carte Leaflet + markers dynamiques
- [x] En cours / prochain / terminé avec countdown
- [x] Distance à vol d'oiseau + lien itinéraire
- [x] i18n FR / ES / EU
- [x] PWA + cache offline
- [x] Générique multi-festivals

**v2 — Enrichissement**
- [ ] Routing piéton réel via OSRM (gratuit, open source)
- [ ] Filtres : type d'événement, gratuit/payant
- [ ] Favoris (localStorage)
- [ ] Mode liste en complément de la carte

**v3 — Backend léger**
- [ ] Scraping auto du programme officiel
- [ ] Notifications push (début dans 15 min)
- [ ] Remontées communautaires (signalement erreurs programme)

## 📄 Licence

MIT – Libre d'utilisation, modification et redistribution.
