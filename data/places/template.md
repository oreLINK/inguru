# Template — Fichiers de lieux (`data/places/`)

## Fichier

| Propriété | Valeur |
|-----------|--------|
| Nom | `{CITYID}.json` — ex. `BAY.json`, `DAX.json` |
| Emplacement | `data/places/` |
| Encodage | UTF-8, JSON valide |

Structure racine :

```json
{
  "cityId": "BAY",
  "places": [ ... ]
}
```

---

## Tableau des champs

| Champ | Obligatoire | Facultatif | Devinable | Non devinable |
|-------|-------------|------------|-----------|---------------|
| `cityId` (racine) | ✅ | | ✅ dérivé du nom de ville fourni en argument | |
| `id` | ✅ | | ✅ slug de `name.fr` préfixé du `cityId` | |
| `name.fr` | ✅ | | | ✅ doit figurer dans la source |
| `name.es` | | ✅ | ✅ copie de `name.fr` si absent | |
| `name.eu` | | ✅ | ✅ copie de `name.fr` si absent | |
| `coords.lat` | ✅ | | | ✅ doit figurer dans la source |
| `coords.lng` | ✅ | | | ✅ doit figurer dans la source |

> **Règle de rejet** : si `coords.lat` ou `coords.lng` est absent ou invalide dans la source → place rejetée dans `reject.json`.

---

## Champ `cityId` (racine)

| Propriété | Valeur |
|-----------|--------|
| Type | string |
| Format | 2–4 lettres majuscules, identifiant unique de la ville |
| Si inconnu | Ne pas créer le fichier — `cityId` est obligatoire |

```json
"cityId": "BAY"   ← Bayonne
"cityId": "DAX"   ← Dax
"cityId": "MDM"   ← Mont-de-Marsan
"cityId": "PAM"   ← Pampelune
```

---

## Objet place

```json
{
  "id": "BAY-PLACE-LIBERTE",
  "name": {
    "fr": "Place de la Liberté",
    "es": "Plaza de la Libertad",
    "eu": "Askatasun Plaza"
  },
  "coords": {
    "lat": 43.4927,
    "lng": -1.4743
  }
}
```

---

### `id`

- Format : `{CITYID}-{PLACEID}` tout en majuscules, mots séparés par des tirets
- `PLACEID` = slug du nom français sans accents, simplifié autant que possible
- Doit être **unique dans toute l'application**
- Si le nom est ambigu entre plusieurs villes, ajouter le suffixe `cityId`
- Si le lieu n'a pas de nom propre identifiable : **ne pas créer la place**

```
"id": "BAY-PLACE-LIBERTE"   ← Place de la Liberté, Bayonne
"id": "BAY-QUAI-NIVE"       ← Quai Galuperie – Scène Nive (simplifié)
"id": "PAM-ESTAFETA"        ← Calle Estafeta, Pampelune
"id": "DAX-ARENES-DAX"      ← Arènes de Dax (suffixe ajouté pour lever l'ambiguïté)
```

---

### `name`

- Traduction du nom du lieu dans les 3 langues : `fr` (français), `es` (espagnol), `eu` (basque)
- Chaque clé contient la vraie traduction locale — pas le nom français répété partout
- Si une traduction est introuvable : répéter la valeur `fr`
- Si le nom est identique dans toutes les langues (nom propre invariant) : répéter la même valeur

```json
"name": {
  "fr": "Place de la Liberté",
  "es": "Plaza de la Libertad",
  "eu": "Askatasun Plaza"
}
```

```json
"name": {
  "fr": "Ciudadela de Pamplona",
  "es": "Ciudadela de Pamplona",
  "eu": "Iruñeko Gotorlekua"
}
```

```json
"name": {
  "fr": "Calle Estafeta",
  "es": "Calle Estafeta",
  "eu": "Estafeta Kalea"
}
```

---

### `coords`

- `lat` : latitude décimale WGS84, précision ≥ 4 décimales
- `lng` : longitude décimale WGS84, précision ≥ 4 décimales

```json
"coords": { "lat": 43.4927, "lng": -1.4743 }   ← Place de la Liberté, Bayonne
"coords": { "lat": 42.8214, "lng": -1.6401 }   ← Calle Estafeta, Pampelune
"coords": { "lat": 43.7096, "lng": -1.0506 }   ← Arènes de Dax
```
