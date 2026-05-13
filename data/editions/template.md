# Template — Fichiers d'éditions (`data/editions/`)

## Fichier

| Propriété | Valeur |
|-----------|--------|
| Nom | `{EDITIONID}.json` — ex. `BAY-FDB-2026.json`, `PAM-SFM-2026.json` |
| Emplacement | `data/editions/` |
| Encodage | UTF-8, JSON valide |

Un fichier par édition (fête × année). Contient uniquement les métadonnées de l'édition : dates, année, références. Les événements sont dans `data/events/{EDITIONID}.json`.

Structure racine :

```json
{
  "id": "BAY-FDB-2026",
  "feteId": "BAY-FDB",
  "cityId": "BAY",
  "year": 2026,
  "dates": { "start": "2026-07-15", "end": "2026-07-19" }
}
```

---

## Tableau des champs

| Champ | Obligatoire | Facultatif | Devinable | Non devinable |
|-------|-------------|------------|-----------|---------------|
| `id` | ✅ | | ✅ = nom du fichier sans `.json` | |
| `feteId` | ✅ | | ✅ dérivé de `id` (sans l'année) | |
| `cityId` | ✅ | | ✅ dérivé de `id` (premier segment) | |
| `year` | ✅ | | ✅ dérivé de `id` (dernier segment) | |
| `dates.start` | ✅ | | | ✅ doit figurer dans la source |
| `dates.end` | ✅ | | | ✅ doit figurer dans la source |

---

## Champ `id`

| Propriété | Valeur |
|-----------|--------|
| Type | string |
| Format | `{FETEFILEID}-{YEAR}` — identique au nom du fichier sans `.json` |

```
"id": "BAY-FDB-2026"   ← Fêtes de Bayonne 2026
"id": "PAM-SFM-2026"   ← Sanfermines 2026
"id": "DAX-FER-2026"   ← Ferias de Dax 2026
```

---

## Champ `feteId`

Référence le fichier `data/fetes/{feteId}.json` correspondant.

```
"feteId": "BAY-FDB"   ← data/fetes/BAY-FDB.json
"feteId": "PAM-SFM"   ← data/fetes/PAM-SFM.json
```

> Devinable : supprimer le dernier segment `-{YEAR}` de `id`.

---

## Champ `cityId`

Identifiant ISO de la ville. Devinable depuis le premier segment de `id`.

```
"cityId": "BAY"   ← BAY-FDB-2026
"cityId": "PAM"   ← PAM-SFM-2026
"cityId": "DAX"   ← DAX-FER-2026
```

---

## Champ `year`

Année de l'édition. Devinable depuis le dernier segment de `id`.

```json
"year": 2026
```

---

## Champ `dates`

Dates de début et de fin de l'édition.

| Champ | Type | Format |
|-------|------|--------|
| `start` | string | ISO 8601 date — `YYYY-MM-DD` |
| `end` | string | ISO 8601 date — `YYYY-MM-DD` |

```json
"dates": { "start": "2026-07-15", "end": "2026-07-19" }   ← BAY-FDB-2026
"dates": { "start": "2026-07-06", "end": "2026-07-14" }   ← PAM-SFM-2026
"dates": { "start": "2026-08-04", "end": "2026-08-09" }   ← DAX-FER-2026
```
