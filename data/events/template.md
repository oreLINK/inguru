# Template — Fichiers d'événements (`data/events/`)

## Fichier

| Propriété | Valeur |
|-----------|--------|
| Nom | `{EDITIONID}.json` — ex. `BAY-FDB-2026.json`, `PAM-SFM-2026.json` |
| Emplacement | `data/events/` |
| Encodage | UTF-8, JSON valide |

Un fichier par édition (même granularité que `data/editions/`). Contient tous les événements de l'édition.

Structure racine :

```json
{
  "editionId": "BAY-FDB-2026",
  "feteId": "BAY-FDB",
  "cityId": "BAY",
  "events": [ ... ]
}
```

---

## Tableau des champs racine

| Champ | Obligatoire | Facultatif | Devinable | Non devinable |
|-------|-------------|------------|-----------|---------------|
| `editionId` | ✅ | | ✅ = nom du fichier sans `.json` | |
| `feteId` | ✅ | | ✅ dérivé de `editionId` (sans l'année) | |
| `cityId` | ✅ | | ✅ dérivé de `editionId` (premier segment) | |
| `events` | ✅ | | | ✅ tableau d'objets événement |

---

## Tableau des champs d'un événement

| Champ | Obligatoire | Facultatif | Devinable | Non devinable |
|-------|-------------|------------|-----------|---------------|
| `venueId` | ✅ | | | ✅ ref vers `data/places/{cityId}.json` |
| `shortName` | ✅ | | | ✅ libellé court pour l'UI |
| `startTimestamp` | ✅ | | | ✅ doit figurer dans la source |
| `endTimestamp` | | ✅ | | chaîne vide `""` si inconnue |
| `title.fr` | ✅ | | | ✅ doit figurer dans la source |
| `title.es` | | ✅ | ✅ copie de `title.fr` si absent | |
| `title.eu` | | ✅ | ✅ copie de `title.fr` si absent | |
| `description.fr` | ✅ | | | ✅ doit figurer dans la source |
| `description.es` | | ✅ | ✅ copie de `description.fr` si absent | |
| `description.eu` | | ✅ | ✅ copie de `description.fr` si absent | |
| `payment` | | ✅ | | présent seulement si `isPaid: true` |
| `artistName` | | ✅ | | nom de l'artiste ou groupe |

---

## Objet événement

```json
{
  "venueId": "BAY-PLACE-LIBERTE",
  "shortName": "Lâcher de vaches",
  "startTimestamp": "2026-07-15T17:00:00+02:00",
  "endTimestamp": "2026-07-15T18:30:00+02:00",
  "title": {
    "fr": "Ouverture officielle – Lâcher de vaches",
    "es": "Apertura oficial – Suelta de vacas",
    "eu": "Irekiera ofiziala – Behiak askatzea"
  },
  "description": {
    "fr": "La vache landaise fait son entrée pour le coup d'envoi des fêtes.",
    "es": "La vaca landesa hace su entrada para el inicio de las fiestas.",
    "eu": "Landako behia hasten du festen hasiera."
  },
}
```

---

### `venueId`

- Référence un `id` existant dans `data/places/{cityId}.json`
- Format : `{CITYID}-{PLACEID}` — ex. `BAY-PLACE-LIBERTE`, `PAM-ESTAFETA`

> **Règle de rejet** : si la place référencée n'existe pas dans `data/places/{cityId}.json`, l'événement doit être signalé.

---

### `shortName`

Libellé court affiché dans les listes et cartes de l'app.

- Longueur recommandée : ≤ 30 caractères
- Pas de traduction (langue unique, généralement le nom usuel)

```
"shortName": "Chupinazo"
"shortName": "Encierro"
"shortName": "Lâcher de vaches"
"shortName": "Feu d'artifice"
```

---

### `startTimestamp` / `endTimestamp`

- Format : ISO 8601 avec offset timezone — `YYYY-MM-DDTHH:MM:SS+HH:MM`
- `endTimestamp` peut être une chaîne vide `""` si l'heure de fin est inconnue
- Offset à utiliser : `+02:00` en heure d'été (CEST), `+01:00` en heure d'hiver (CET)

```json
"startTimestamp": "2026-07-06T12:00:00+02:00"
"endTimestamp": "2026-07-06T12:30:00+02:00"
"endTimestamp": ""
```

---

### `title` et `description`

- Textes dans les 3 langues : `fr`, `es`, `eu`
- Si une traduction est introuvable : répéter la valeur `fr`
- `description` : 1 à 3 phrases, ton informatif et vivant

---

### `payment` (facultatif)

Présent uniquement si l'événement est payant avec des détails de billetterie.

```json
"payment": {
  "isPaid": true,
  "isTicketMandatory": true,
  "isTicketOnline": false,
  "linkTicket": "https://example.com/inscription"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `isPaid` | boolean | toujours `true` si le bloc est présent |
| `isTicketMandatory` | boolean | billet obligatoire pour entrer |
| `isTicketOnline` | boolean | achat en ligne disponible |
| `linkTicket` | string | URL d'achat ou d'inscription |

---

### `artistName` (facultatif)

Nom de l'artiste ou du groupe pour les concerts.

```json
"artistName": "Oreka TX"
"artistName": "Fid Mella"
```
