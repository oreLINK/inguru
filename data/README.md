# Architecture médaillon — Inguru Data

```
data/
├── config.json          ← Configuration globale (zoom, vitesse marche…)
├── index.json           ← Liste des éditions affichables (cityId + feriaId + year)
│
├── bronze/              ── COUCHE BRONZE — données brutes ────────────────
│   └── cities/
│       └── {cityId}/
│           └── {feriaId}/
│               └── {year}/
│                   └── events_raw.json   ← programme brut (champs non normalisés)
│
├── silver/              ── COUCHE SILVER — données nettoyées ─────────────
│   ├── cities/
│   │   └── {cityId}/
│   │       ├── city.json        ← infos ville fixes (nom, GPS, traductions…)
│   │       └── places.json      ← référence des lieux (IDs + coords + lien Maps)
│   ├── ferias/
│   │   └── {feriaId}.json       ← infos fixes de la feria + éditions (dates + noms adaptés)
│   └── cities/
│       └── {cityId}/
│           └── {feriaId}/
│               └── {year}/
│                   └── events_clean.json ← timestamps ISO, lieux normalisés, doublons supprimés
│
└── gold/                ── COUCHE GOLD — données agrégées prêtes pour l'app ──
    └── {cityId}__{feriaId}__{year}.json   ← bundle édition (ville + feria + dates + places + events), sans dossiers
```

## Flux de données

```
Web (scraping)
     ↓
  BRONZE  events_raw.json     ← programme brut depuis la source
     ↓  (nettoyage : timestamps, déduplication, normalisation lieux)
  SILVER  events_clean.json   ← structuré, validé, sans bruit
     ↓  (enrichissement : traductions, venueIds, shortName, tags)
  GOLD    {cityId}__{feriaId}__{year}.json  ← consommé directement par l'app
```

## Ajouter une nouvelle ville/fête
1. Créer `bronze/cities/{cityId}/{feriaId}/{year}/events_raw.json`
2. Créer `silver/cities/{cityId}/city.json` + `silver/cities/{cityId}/places.json`
3. Créer `silver/ferias/{feriaId}.json` (infos fixes + éditions)
4. Créer `silver/cities/{cityId}/{feriaId}/{year}/events_clean.json`
5. Générer `gold/{cityId}__{feriaId}__{year}.json`
6. Ajouter une entrée dans `index.json`
