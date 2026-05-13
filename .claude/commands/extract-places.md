---
description: Extrait les lieux d'un fichier Markdown et génère le JSON correspondant dans data/places/. Utiliser avec /extract-places <NomVille> <chemin/fichier.md>.
---

# extract-places

Extrait la liste des lieux depuis un fichier Markdown et génère un fichier JSON conforme à la structure `data/places/`.

## Arguments

`$ARGUMENTS` — format attendu : `<NomVille> <chemin/vers/fichier.md>`

Exemple : `Pampelune data/raw/pampelune-lieux.md`

---

## Étapes à suivre

### 1. Analyser les arguments

Décompose `$ARGUMENTS` :
- **Premier mot** = nom de la ville (ex. `Pampelune`)
- **Reste** = chemin du fichier source (ex. `data/raw/pampelune-lieux.md`)

Si les arguments sont manquants ou mal formés, explique la syntaxe attendue et arrête.

---

### 2. Lire les règles du template

Lis `data/places/template.md` pour rappeler les règles de structure, de nommage et les champs obligatoires.

Champs **obligatoires** pour qu'une place soit incluse dans le JSON final :
- `id` (dérivable du nom si absent)
- `name.fr` (au minimum)
- `coords.lat` ET `coords.lng`

Champs **calculables automatiquement** :
- `id` : si absent, le dériver depuis `name.fr` → slug sans accents en majuscules préfixé du cityId (ex. `BAY-PLACE-LIBERTE`)
- `name.es` et `name.eu` : si absents, répéter `name.fr`

---

### 3. Déterminer le `cityId`

Parcours les fichiers existants dans `data/places/` (ignore `template.md` et `reject.json`).
Pour chaque `{CITYID}.json`, lis le champ racine `cityId`.

Tente de faire correspondre le nom de ville fourni à un fichier existant :
- Comparaison insensible à la casse et aux accents (ex. `Pampelune` → `PAM`, `Bayonne` → `BAY`)
- Si une correspondance est trouvée : utilise ce `cityId`
- Si aucune correspondance : demande confirmation à l'utilisateur pour créer un nouveau `cityId` (2–4 lettres majuscules)

---

### 4. Lire et extraire les lieux depuis le fichier source

Lis le fichier Markdown fourni.

Pour chaque lieu identifié dans le document, extrait :
- `name.fr` — nom en français
- `name.es` — nom en espagnol (si présent)
- `name.eu` — nom en basque (si présent)
- `coords.lat` — latitude décimale WGS84 (≥ 4 décimales)
- `coords.lng` — longitude décimale WGS84 (≥ 4 décimales)
- `id` — si explicitement indiqué dans le fichier source

Adapte-toi au format du fichier source (tableau, liste, sections, texte libre…).

---

### 5. Valider chaque lieu

Pour chaque lieu extrait, vérifie que `coords.lat` et `coords.lng` sont présents et numériques.

**Si les coordonnées sont manquantes ou invalides → place rejetée** (voir étape 7).

Pour les places valides, génère les champs manquants :
- `id` absent → slug depuis `name.fr` : retire les accents, remplace espaces/caractères spéciaux par `-`, passe en majuscules, préfixe avec `{CITYID}-`
- `name.es` absent → copie `name.fr`
- `name.eu` absent → copie `name.fr`

---

### 6. Écrire le fichier JSON des places valides

Détermine le nom du fichier de sortie :
- Chemin cible : `data/places/{CITYID}.json`
- Si ce fichier **existe déjà** : essaie `{CITYID}-2.json`, puis `{CITYID}-3.json`, etc., jusqu'à trouver un nom disponible

Structure du fichier à écrire :

```json
{
  "cityId": "XXX",
  "places": [
    {
      "id": "XXX-NOM-DU-LIEU",
      "name": {
        "fr": "Nom en français",
        "es": "Nombre en español",
        "eu": "Izena euskaraz"
      },
      "coords": {
        "lat": 00.0000,
        "lng": 0.0000
      }
    }
  ]
}
```

Écris le fichier. Confirme le chemin exact créé.

---

### 7. Écrire les places rejetées dans `reject.json`

Si des places ont été rejetées (coordonnées manquantes ou invalides) :

Lis le fichier `data/places/reject.json` s'il existe déjà.
**Ne supprime jamais ce fichier et ne supprime jamais les entrées existantes.**

Ajoute les nouvelles places rejetées à la liste existante. Structure d'une place rejetée :

```json
{
  "id": "XXX-NOM-SI-CONNU",
  "name": {
    "fr": "Nom en français si connu",
    "es": "",
    "eu": ""
  },
  "coords": {
    "lat": null,
    "lng": null
  },
  "_source": "NomVille — chemin/du/fichier.md",
  "_reason": "Description courte du champ manquant (ex: coords absentes)"
}
```

Écris `data/places/reject.json` avec la liste complète (anciennes + nouvelles).

---

### 8. Résumé final

Affiche un résumé clair :
- Fichier source lu
- Ville et `cityId` utilisés
- Nombre de places extraites
- Nombre de places valides → fichier JSON créé (chemin)
- Nombre de places rejetées → ajoutées dans `reject.json` (avec les raisons)
