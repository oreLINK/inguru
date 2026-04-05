# Prompt — Nettoyage bronze → silver (events)

## Utilisation

Donne ce prompt à Claude en lui fournissant le fichier bronze à transformer.  
Le fichier source suit la convention : `{ville}-{feria-slug}-{année}-events-raw.json`

---

## Prompt

```
Transforme le fichier bronze ci-joint en fichier silver Inguru au format décrit ci-dessous.

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

### Fichier de sortie

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
```
