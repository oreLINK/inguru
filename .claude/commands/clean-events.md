---
description: Vérifie et corrige les événements d'une édition. Complète les champs devinables absents, traduit les champs multilingues incomplets, signale les anomalies non corrigeables, et trie les événements chronologiquement. Utiliser avec /clean-events <EDITIONID>.
---

# clean-events

Vérifie la conformité des événements de `data/events/{EDITIONID}.json` par rapport au template, corrige les champs devinables manquants, traduit les champs multilingues incomplets, et trie les événements chronologiquement.

## Arguments

`$ARGUMENTS` — format attendu : `<EDITIONID>` (ex. `PAM-SFM-2026`, `BAY-FDB-2026`)

Si l'argument est absent ou mal formé, rappelle la syntaxe et arrête.

---

## Étapes à suivre

### 1. Analyser les arguments

Décompose `$ARGUMENTS` :
- **EDITIONID** = l'argument complet (ex. `PAM-SFM-2026`)
- **cityId** = premier segment (ex. `PAM`)
- **feteId** = tout sauf le dernier segment (ex. `PAM-SFM`)

Valide le format : doit correspondre à `{CITYID}-{CODE}-{YEAR}` (au moins 3 segments séparés par `-`, dernier segment = 4 chiffres).

Si invalide → expliquer la syntaxe et arrêter.

---

### 2. Lire les règles du template

Lis `data/events/template.md` pour rappeler les règles.

Champs et leur statut (à dériver dynamiquement du template) :

| Champ | Statut |
|-------|--------|
| `venueId` | Obligatoire — ref vers `data/places/{cityId}.json` |
| `shortName` | Obligatoire — objet `{fr, es, eu}`, max 23 chars par langue |
| `startTimestamp` | Obligatoire — ISO 8601 avec offset timezone |
| `endTimestamp` | Facultatif — chaîne vide `""` si inconnu |
| `title.fr` | Obligatoire |
| `title.es` | Devinable — traduit depuis une langue disponible |
| `title.eu` | Devinable — traduit depuis une langue disponible |
| `description.fr` | Facultatif |
| `description.es` | Devinable — traduit depuis une langue disponible |
| `description.eu` | Devinable — traduit depuis une langue disponible |
| `payment` | Facultatif |
| `artistName` | Facultatif |

---

### 3. Charger les places valides de la ville

Lis `data/places/{cityId}.json`.

Construis la liste des `id` valides. C'est la **référence exclusive** pour valider les `venueId`.

---

### 4. Identifier le fichier à traiter

Cherche dans `data/events/` le fichier correspondant à l'édition :
- Essaie d'abord `{EDITIONID}.json`
- Si plusieurs variantes existent (`{EDITIONID}-2.json`, etc.), prends le fichier avec le **numéro le plus élevé** (le plus récent)

Si aucun fichier trouvé → afficher un message d'erreur et arrêter.

---

### 5. Analyser et corriger chaque événement

Lis le fichier entièrement, puis pour chaque événement du tableau `events` :

#### 5a. `venueId`

- Absent ou vide → **non devinable**, signaler
- Présent mais absent de la liste des places valides → **venueId inconnu**, signaler
- Valide → ✅

#### 5b. `shortName`

- Absent → **non devinable**, signaler
- Présent comme **string** → convertir en objet `{"fr": val, "es": val, "eu": val}` (tronquer à 23 chars si nécessaire)
- Présent comme **objet** : pour chaque langue (`fr`, `es`, `eu`) :
  - Si la langue est absente ou vide : voir règle de traduction ci-dessous (§ Traduction)
  - Si présente mais > 23 chars → tronquer à 23 chars

#### 5c. `startTimestamp`

- Absent ou vide → **non devinable**, signaler
- Présent mais format invalide (doit être ISO 8601 avec offset, ex. `2026-07-06T12:00:00+02:00`) → signaler
- Valide → ✅

#### 5d. `endTimestamp`

- Absent → ajouter `""` (devinable, corriger silencieusement)
- Présent → ✅ (ne pas modifier même si vide)

#### 5e. `title`

- `title` entièrement absent → **non devinable**, signaler
- `title` présent : pour chaque langue (`fr`, `es`, `eu`) :
  - Si la langue est absente ou vide : voir règle de traduction ci-dessous (§ Traduction)
  - Si `title.fr` absent et aucune langue disponible → **non devinable**, signaler

#### 5f. `description`

- `description` entièrement absent → laisser absent (facultatif), ne pas signaler
- `description` présent : pour chaque langue (`fr`, `es`, `eu`) :
  - Si la langue est absente ou vide : voir règle de traduction ci-dessous (§ Traduction)

#### 5g. Champs parasites

Si un événement contient des champs `_source`, `_reason`, `_venueRaw` (marqueurs internes), les retirer silencieusement.

---

### Règle de traduction (champs multilingues)

S'applique à `shortName`, `title` et `description` dès qu'au moins une langue est disponible dans l'objet et qu'une autre est absente ou vide.

**Priorité de source :** `fr` → `es` → `eu` (utiliser la première langue non vide disponible comme source).

**Méthode :**

- Si la langue cible manquante est `fr`, `es` ou `eu` ET que la source est dans la **même langue romane** (`fr` ↔ `es`) → **traduire** dans la langue cible
- Si la langue cible est `eu` (basque) et que la source est `fr` ou `es` → **traduire** en basque
- Si la langue cible est `fr` ou `es` et que la source est `eu` → **traduire** depuis le basque

Règle pratique : pour `shortName`, `title` et `description`, si une traduction est triviale (même mot, nom propre, intitulé identique dans toutes les langues), copier directement. Sinon, traduire activement dans la langue cible.

Signaler les champs traduits automatiquement dans le rapport (colonne ⚠️).

---

### 6. Trier les événements

Après correction de tous les événements, **trier le tableau `events`** :

1. **Tri primaire** : `startTimestamp` croissant (ordre chronologique)
2. **Tri secondaire** (à `startTimestamp` égal) : `venueId` croissant (ordre alphabétique)

---

### 7. Réécrire le fichier

Si des corrections ont été apportées (traductions, conversions, ajout d'`endTimestamp`, suppression de champs parasites, tri), **réécrire le fichier** avec le JSON corrigé, formaté proprement (indentation 2 espaces).

Si aucune correction nécessaire → ne pas toucher au fichier.

---

### 8. Rapport final dans le chat

Afficher un rapport synthétique :

```
## Rapport clean-events — {EDITIONID}

### {EDITIONID}.json — {N} événements

| # | venueId | shortName.fr | start | title | description | Corrections |
|---|---------|--------------|-------|-------|-------------|-------------|
| 1 | ✅ PAM-CIUDADELA | ✅ Dianas | ✅ | ✅ fr/es/eu | — | — |
| 2 | ✅ PAM-PLAZA-FUEROS | ✅ Festival Folc… | ✅ | ✅ fr ⚠️ es/eu trad. | ⚠️ es/eu trad. | title.es, title.eu, desc.es, desc.eu |
| 3 | ❌ PAM-INCONNU | ✅ Événement X | ✅ | ✅ | — | venueId inconnu |
```

Légende :
- ✅ = présent et valide
- ⚠️ = absent → corrigé automatiquement (préciser ce qui a été rempli ou traduit)
- ❌ = absent ou invalide, non devinable → intervention manuelle requise

Terminer par un résumé global :
- Nombre total d'événements
- Nombre de corrections appliquées automatiquement (préciser les types : traductions, conversions shortName, endTimestamp ajoutés, champs parasites retirés, tri)
- Nombre d'anomalies ❌ nécessitant une intervention manuelle (avec la liste des événements concernés et le champ problématique)
