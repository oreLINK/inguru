Transforme le fichier bronze ci-joint en fichier silver Inguru au format décrit ci-dessous.
Fichier source bronze : /Users/aurelienbertrand/Library/Mobile Documents/com~apple~CloudDocs/Documents/DATA/inguru/data/01_bronze/02_ferias/condom/bandas-condom/2026/condom-bandas-condom-2026-events-raw.json
Dossier cible silver : /Users/aurelienbertrand/Library/Mobile Documents/com~apple~CloudDocs/Documents/DATA/inguru/data/02_silver/02_ferias/condom/bandas-condom/2026

---

### Identification

À partir du nom du fichier ou de son contenu, détermine :
- `ville` : ex `bayonne` (minuscules, sans accents)
- `feria-slug` : ex `foire-jambon` (minuscules, sans accents, tirets)
- `année` : ex `2026`

**Préfixe d'ID** : premières lettres de chaque mot du slug feria + première lettre de la ville + 2 derniers chiffres de l'année.  
Exemples : `foire-jambon` + `bayonne` + `2026` → `fjb26` · `fetes` + `bayonne` + `2026` → `fb26`

---

### Règles de transformation

**`id`**
Séquence à 4 chiffres avec le préfixe calculé : `fjb26-0001`, `fjb26-0002`…  
Assigne les IDs dans l'ordre chronologique (par jour puis par heure).

**`category`**
Infère depuis le titre et le contexte. Valeurs possibles :
`gastronomie` · `sport` · `musique` · `concerts` · `tauromachie` · `traditions` · `spectacles` · `enfants`

**`startDate` / `endDate`**
Format `DD/MM/YYYY`. Extraits depuis `day` (date du bloc) et `time_raw`.  
`endDate` = null si l'événement se termine le même jour que `startDate`.

**`startTime` / `endTime`**
Format `HH:MM` (24h). Extraits depuis `time_raw`.  
`time_raw: "9h30 à 11h30"` → `startTime: "09:30"`, `endTime: "11:30"`  
`time_raw: "11h"` → `startTime: "11:00"`, `endTime: null`  
`endTime` = null si non précisé.

**`location`**
Slug du lieu : normalise `location_raw` en minuscules sans accents, tirets à la place des espaces.  
Exemples : `"Carreau des Halles"` → `carreau-halles` · `"Trinquet Saint-André"` → `trinquet-saint-andre`  
Si le lieu contient une flèche (`→`), retiens le lieu de destination.

**`payment`**
```json
{
  "isPaid": false,
  "isTicketMandatory": false,
  "isTicketOnline": false,
  "linkTicket": null
}
```
- `isPaid: true` si `price_raw` est présent et mentionne un tarif (même partiellement payant)
- `isTicketMandatory: true` si l'accès requiert un billet (payant ou gratuit sur réservation)
- `isTicketOnline` et `linkTicket` : null par défaut, à renseigner manuellement si connu

**`title_long`** / **`title_short`**
```json
{ "fr": "...", "es": "...", "eus": "..." }
```
- `title_long.fr` : repris de `title_raw`, reformulé proprement si nécessaire
- `title_short.fr` : version courte (≤ 30 caractères) pour les marqueurs carte
- `es` : traduction en espagnol (castillan)
- `eus` : traduction en basque (euskara)

**`description`**
```json
{ "fr": "1-2 phrases contextuelles.", "es": "...", "eus": "..." }
```
Rédige une description courte en français (1-2 phrases) à partir du titre, du lieu et du contexte de la feria.  
Traduis-la ensuite en espagnol (`es`) et en basque (`eus`).

**`artistName`** / **`listenArtist`**
À inclure uniquement pour les events de category `musique` ou `concerts`.  
```json
"artistName": null,
"listenArtist": {
  "spotify": false,
  "appleMusic": false,
  "youtube": false,
  "soundcloud": false
}
```
Mets `artistName` si l'artiste est identifiable dans `title_raw`. Chaque service à `true` si l'artiste y est présent (laisse `false` si inconnu).

---

### Structure complète d'un event silver

```json
{
  "id": "fjb26-0001",
  "category": "gastronomie",
  "startDate": "23/04/2026",
  "startTime": "09:30",
  "endDate": null,
  "endTime": "11:30",
  "location": "carreau-halles",
  "payment": {
    "isPaid": false,
    "isTicketMandatory": false,
    "isTicketOnline": false,
    "linkTicket": null
  },
  "title_long": { "fr": "Concours du jambon fermier", "es": null, "eus": null },
  "title_short": { "fr": "Concours Jambon Fermier", "es": null, "eus": null },
  "description": { "fr": "Les producteurs s'affrontent pour le titre du meilleur jambon de l'année.", "es": null, "eus": null }
}
```

---

### Fichier de sortie — events

```json
{
  "events": [ ... ]
}
```

**Chemin et nom du fichier :**
```
data/02_silver/02_ferias/{ville}/{feria-slug}/{ville}-{feria-slug}-{année}-events.json
```

Exemple :
```
data/02_silver/02_ferias/bayonne/foire-jambon/bayonne-foire-jambon-2026-events.json
```

---

### Fichiers de ville — town.json et places.json

Si les fichiers `town.json` et `places.json` n'existent pas encore pour cette ville, les créer dans :
```
data/02_silver/01_town/{ville}/
```

---

#### town.json

Informations générales sur la ville.

```json
{
  "id": "{ville}",
  "name": {
    "fr": "...",
    "es": "...",
    "eu": "..."
  },
  "country": "FR",
  "center": {
    "lat": 0.0,
    "lng": 0.0
  },
  "category": "small | medium | large"
}
```

- `id` : slug de la ville (minuscules, sans accents)
- `name` : nom dans les trois langues (`fr`, `es`, `eu`)
- `center` : coordonnées GPS du centre-ville
- `category` : `small` (< 20 000 hab.) · `medium` (20 000–100 000) · `large` (> 100 000)

---

#### places.json

Liste de tous les lieux référencés dans les events de la ville (tous événements confondus).

```json
[
  {
    "id": "nom-du-lieu",
    "name": {
      "fr": "...",
      "es": "...",
      "eu": "..."
    },
    "coords": {
      "lat": 0.0,
      "lng": 0.0
    },
    "type": "..."
  }
]
```

- `id` : slug du lieu, identique au champ `location` des events
- `name` : nom complet dans les trois langues
- `coords` : coordonnées GPS approximatives du lieu
- `type` : parmi `place` · `scene` · `street` · `building` · `sport` · `monument`

> Inclure un entry par `location` distinct utilisé dans les events silver de la ville.
