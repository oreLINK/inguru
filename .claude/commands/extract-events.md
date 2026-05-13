---
description: Extrait les événements d'un fichier Markdown et génère le JSON correspondant dans data/events/. Utiliser avec /extract-events <EDITIONID> <chemin/fichier.md>.
---

# extract-events

Extrait la liste des événements depuis un fichier Markdown et génère un fichier JSON conforme à la structure `data/events/`.

## Arguments

`$ARGUMENTS` — format attendu : `<EDITIONID> <chemin/vers/fichier.md>`

Exemple : `BAY-FDB-2026 data/raw/bay-fdb-2026.md`

---

## Étapes à suivre

### 1. Analyser les arguments

Décompose `$ARGUMENTS` :
- **Premier mot** = `EDITIONID` (ex. `BAY-FDB-2026`)
- **Reste** = chemin du fichier source (ex. `data/raw/bay-fdb-2026.md`)

Valide le format de l'`EDITIONID` : doit correspondre à `{CITYID}-{CODE}-{YEAR}` (ex. `BAY-FDB-2026`, `PAM-SFM-2026`).

Dérive les champs racine :
- `cityId` = premier segment (ex. `BAY`)
- `feteId` = tout sauf le dernier segment (ex. `BAY-FDB`)
- `year` = dernier segment (ex. `2026`)

Si les arguments sont manquants ou mal formés, explique la syntaxe attendue et arrête.

---

### 2. Lire les règles du template

Lis `data/events/template.md` pour rappeler les règles de structure, de nommage et les champs obligatoires.

Champs **obligatoires** pour qu'un événement soit inclus dans le JSON final :
- `venueId` (doit exister dans `data/places/{cityId}.json`)
- `shortName`
- `startTimestamp`
- `title.fr`
- `description.fr`

Champs **calculables automatiquement** :
- `title.es` et `title.eu` : si absents, copier `title.fr`
- `description.es` et `description.eu` : si absents, copier `description.fr`
- `endTimestamp` : chaîne vide `""` si non renseignée dans la source

---

### 3. Charger les places valides de la ville

Lis `data/places/{cityId}.json`.

Construis la liste des `id` de places disponibles (ex. `["BAY-PLACE-LIBERTE", "BAY-ARENES", ...]`).

Cette liste est la **référence exclusive** pour valider les `venueId` des événements.

---

### 4. Lire et extraire les événements depuis le fichier source

Lis le fichier Markdown fourni. Adapte-toi à son format (tableau, liste, sections, texte libre…).

Pour chaque événement identifié, extrais :

- **Lieu** — nom ou identifiant du lieu mentionné dans la source
- **`shortName`** — nom court de l'événement (≤ 30 caractères, langue usuelle)
- **`startTimestamp`** — date et heure de début
- **`endTimestamp`** — date et heure de fin (facultatif)
- **`title`** — titre complet dans les langues disponibles (`fr`, `es`, `eu`)
- **`description`** — description dans les langues disponibles (`fr`, `es`, `eu`)
- **`payment`** — si l'événement est payant : `isPaid`, `isTicketMandatory`, `isTicketOnline`, `linkTicket`
- **`artistName`** — si un artiste ou groupe est mentionné

---

### 5. Résoudre les `venueId`

Pour chaque événement, tente de faire correspondre le lieu mentionné dans la source à un `id` de la liste chargée à l'étape 3.

**Méthode de correspondance :**
1. Correspondance exacte sur l'`id` (si la source utilise déjà un identifiant structuré)
2. Correspondance normalisée : retire les accents, remplace espaces/caractères spéciaux par `-`, passe en majuscules, préfixe `{CITYID}-`, compare au slug ainsi obtenu
3. Correspondance partielle : si le nom du lieu de la source est contenu dans le `name.fr` de la place (ou inversement)

**Règles de décision :**
- Correspondance certaine → assigne le `venueId`
- Correspondance ambiguë (plusieurs candidats) → **rejette** l'événement avec la raison `"venueId ambigu : {nom_lieu} — candidats : {liste}"`
- Aucune correspondance → **rejette** l'événement avec la raison `"venueId introuvable : {nom_lieu}"`

---

### 6. Valider chaque événement

Pour chaque événement avec un `venueId` résolu :

- `startTimestamp` absent ou non parsable → **événement rejeté** (`"startTimestamp manquant ou invalide"`)
- `title.fr` absent → **événement rejeté** (`"title.fr manquant"`)
- `description.fr` absent → **événement rejeté** (`"description.fr manquante"`)

Pour les événements valides, complète les champs manquants :
- `title.es` absent → copie `title.fr`
- `title.eu` absent → copie `title.fr`
- `description.es` absent → copie `description.fr`
- `description.eu` absent → copie `description.fr`
- `endTimestamp` absent → `""`

Formate les timestamps en ISO 8601 avec offset timezone :
- `YYYY-MM-DDTHH:MM:SS+HH:MM`
- Offset : `+02:00` en heure d'été (CEST, avril–octobre), `+01:00` en heure d'hiver (CET)

---

### 7. Écrire le fichier JSON des événements valides

Détermine le nom du fichier de sortie :
- Chemin cible : `data/events/{EDITIONID}.json`
- Si ce fichier **existe déjà** : essaie `{EDITIONID}-2.json`, puis `{EDITIONID}-3.json`, etc., jusqu'à trouver un nom disponible

Structure du fichier à écrire :

```json
{
  "editionId": "BAY-FDB-2026",
  "feteId": "BAY-FDB",
  "cityId": "BAY",
  "events": [
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
      }
    }
  ]
}
```

Écris le fichier avec une indentation de 2 espaces. Confirme le chemin exact créé.

---

### 8. Écrire les événements rejetés dans `reject.json`

Si des événements ont été rejetés (venueId introuvable, timestamp manquant, title ou description absents) :

Lis le fichier `data/events/reject.json` s'il existe déjà.
**Ne supprime jamais ce fichier et ne supprime jamais les entrées existantes.**

Ajoute les nouveaux événements rejetés à la liste existante. Structure d'un événement rejeté :

```json
{
  "shortName": "Nom court si connu",
  "startTimestamp": "2026-07-15T17:00:00+02:00",
  "title": { "fr": "Titre si connu", "es": "", "eu": "" },
  "_venueRaw": "Nom du lieu tel qu'il apparaît dans la source",
  "_source": "EDITIONID — chemin/du/fichier.md",
  "_reason": "Description courte de la raison du rejet"
}
```

Écris `data/events/reject.json` avec la liste complète (anciennes + nouvelles).

---

### 9. Résumé final

Affiche un résumé clair :
- Fichier source lu
- `editionId`, `cityId`, `feteId` utilisés
- Nombre d'événements extraits depuis la source
- Nombre d'événements valides → fichier JSON créé (chemin)
- Nombre d'événements rejetés → ajoutés dans `reject.json`, avec pour chacun : `shortName` (ou lieu brut) + raison du rejet
