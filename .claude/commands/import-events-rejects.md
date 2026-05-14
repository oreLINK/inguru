---
description: Ré-évalue les événements rejetés d'une édition dans reject.json et réimporte ceux dont la raison du rejet n'est plus valable. Utiliser avec /import-events-rejects <EDITIONID>.
---

# import-events-rejects

Passe en revue les événements rejetés d'une édition dans `data/events/reject.json`, réévalue chaque raison de rejet à la lumière de l'état actuel des données, et réimporte les événements dont la raison du rejet n'est plus valable.

## Arguments

`$ARGUMENTS` — format attendu : `<EDITIONID>`

Exemple : `PAM-SFM-2026`

---

## Étapes à suivre

### 1. Analyser les arguments

Décompose `$ARGUMENTS` :
- **Premier mot** = `EDITIONID` (ex. `PAM-SFM-2026`)

Valide le format : doit correspondre à `{CITYID}-{CODE}-{YEAR}`.

Dérive :
- `cityId` = premier segment (ex. `PAM`)
- `feteId` = tout sauf le dernier segment (ex. `PAM-SFM`)

Si les arguments sont manquants ou mal formés, explique la syntaxe attendue et arrête.

---

### 2. Lire les règles du template

Lis `data/events/template.md`.

Champs **obligatoires** pour qu'un événement soit valide :
- `venueId` (doit exister dans `data/places/{cityId}.json`)
- `shortName` (objet `{fr, es, eu}`, ≤ 23 chars par langue)
- `startTimestamp` (ISO 8601 avec offset timezone)
- `title.fr`
- `description.fr`

Champs **auto-complétables** si absents :
- `title.es` et `title.eu` → copie de `title.fr`
- `description.es` et `description.eu` → copie de `description.fr`
- `endTimestamp` → `""`
- `shortName.es` et `shortName.eu` → copie de `shortName.fr` si `shortName` est un objet partiel

---

### 3. Charger les places valides de la ville

Lis `data/places/{cityId}.json`.

Construis la liste des `id` de places disponibles. C'est la **référence exclusive** pour valider les `venueId`.

---

### 4. Identifier le fichier cible de l'édition

Cherche dans `data/events/` le fichier correspondant à l'édition :
- Essaie d'abord `{EDITIONID}.json`
- Si plusieurs variantes existent (`{EDITIONID}-2.json`, etc.), prends le fichier avec le **numéro le plus élevé** (le plus récent)

Si aucun fichier n'existe pour cette édition, affiche un avertissement mais continue (les événements ré-importés seront ajoutés dans un nouveau fichier `{EDITIONID}.json`).

---

### 5. Charger les événements rejetés de cette édition

Lis `data/events/reject.json`.

Filtre les entrées dont le champ `_source` commence par `{EDITIONID}` (ex. `"PAM-SFM-2026 — ..."` ou juste `"PAM-SFM-2026"`).

Si aucune entrée ne correspond, affiche un message et arrête.

---

### 6. Réévaluer chaque raison de rejet

Pour chaque événement rejeté filtré, analyse le champ `_reason` et réévalue selon les règles ci-dessous.

#### 6a. `venueId introuvable : {nom_lieu}`

Tente à nouveau de résoudre le lieu `_venueRaw` contre la liste de places chargée à l'étape 3.

**Méthode de correspondance (dans l'ordre) :**
1. Correspondance exacte sur l'`id`
2. Correspondance normalisée : retire les accents, remplace espaces/caractères spéciaux par `-`, passe en majuscules, préfixe `{CITYID}-`
3. Correspondance partielle : le nom du lieu de la source est contenu dans le `name.fr` de la place (ou inversement)

**Résultat :**
- Correspondance unique trouvée → raison **résolue**, assigne le `venueId`
- Correspondance ambiguë (plusieurs candidats) → raison **toujours invalide** (ambigu), laisse dans reject
- Aucune correspondance → raison **toujours invalide**, laisse dans reject

#### 6b. `venueId ambigu` ou `_venueRaw` contenant plusieurs lieux

Analyse la structure du `_venueRaw` pour déterminer la nature de la relation entre les lieux. Cette règle s'applique dès que `_venueRaw` contient un connecteur multi-lieu, quelle que soit la formulation exacte du `_reason`.

---

**Cas 6b-i — Lieux conjoints (connecteur "et", "y", "eta", ou virgule)**

Si le `_venueRaw` contient un ou plusieurs des connecteurs suivants : ` y `, ` et `, ` eta `, ou une virgule `,` :

→ **Crée un événement distinct pour chaque lieu résolu.**

Méthode :
1. Découpe le `_venueRaw` sur tous les connecteurs (`,`, ` y `, ` et `, ` eta `) pour obtenir les segments individuels
2. Pour chaque segment, tente de résoudre le lieu avec la même méthode qu'en 6a (exact → normalisé → partiel)
3. Pour chaque segment résolu sans ambiguïté → crée un événement avec ce `venueId`
4. Si **au moins un** segment est résolu → supprime l'entrée de reject (les segments non résolus sont ignorés)
5. Si **aucun** segment ne se résout → laisse dans reject

**Cas 6b-ii — Route "de A à B" (connecteur " a ")**

Si le `_venueRaw` décrit un trajet d'un lieu à un autre via le connecteur ` a ` (et ne contient pas de connecteur conjoint "y/et/eta") :

→ **Crée un seul événement au lieu de départ** (premier segment avant " a ").

Méthode :
1. Découpe le `_venueRaw` sur ` a ` → premier segment = lieu de départ
2. Tente de résoudre le lieu de départ (même méthode qu'en 6a)
3. Correspondance unique trouvée → raison **résolue**, crée l'événement avec ce `venueId`
4. Pas de correspondance unique → raison **toujours invalide**, laisse dans reject

#### 6c. `startTimestamp manquant ou invalide`

Vérifie que le champ `startTimestamp` de l'événement rejeté est présent et au format ISO 8601 valide.

- Si valide → raison **résolue**
- Sinon → raison **toujours invalide**

#### 6d. `title.fr manquant`

Vérifie que le champ `title.fr` est présent et non vide dans l'événement rejeté.

- Si présent → raison **résolue**
- Sinon → raison **toujours invalide**

#### 6e. `description.fr manquante`

Vérifie que `description.fr` est présent et non vide.

- Si présent → raison **résolue**
- Sinon → raison **toujours invalide**

#### 6f. Autre raison

Si la `_reason` ne correspond à aucun des cas ci-dessus, considère la raison comme **toujours invalide** et laisse l'événement dans reject.

---

### 7. Construire les événements ré-importables

Pour chaque entrée reject dont la raison est **résolue**, construis **un événement par `venueId` résolu** (une entrée peut produire plusieurs événements en cas de lieux conjoints 6b-i) :

1. Supprime les champs `_venueRaw`, `_source`, `_reason` (métadonnées internes)
2. Assigne le `venueId` résolu (répète l'opération pour chaque venueId si cas 6b-i)
3. Assure-toi que `shortName` est un objet `{fr, es, eu}` :
   - Si c'est encore une string : convertis en `{"fr": val, "es": val, "eu": val}`, tronqué à 23 chars si nécessaire
   - Si c'est déjà un objet : vérifie que chaque langue est ≤ 23 chars (tronque si besoin)
4. Complète les champs auto-complétables manquants :
   - `title.es` absent → copie `title.fr`
   - `title.eu` absent → copie `title.fr`
   - `description.es` absent → copie `description.fr`
   - `description.eu` absent → copie `description.fr`
   - `endTimestamp` absent → `""`
5. Valide une dernière fois que tous les champs obligatoires sont présents

---

### 8. Écrire les événements ré-importés dans le fichier de l'édition

Si des événements sont ré-importables :

Lis le fichier cible identifié à l'étape 4 (ou crée-le s'il n'existe pas avec la structure racine `editionId`, `feteId`, `cityId`, `events: []`).

**Ajoute les événements ré-importés à la fin du tableau `events`** (ne modifie pas les événements existants).

Écris le fichier avec une indentation de 2 espaces.

---

### 9. Mettre à jour `reject.json`

Lis `data/events/reject.json`.

**Supprime uniquement** les entrées qui ont été ré-importées avec succès (raison résolue).

**Ne modifie jamais** les entrées dont la raison est toujours invalide, ni les entrées d'autres éditions.

**Ne supprime jamais** le fichier `reject.json` lui-même.

Écris `data/events/reject.json` avec la liste mise à jour (indentation 2 espaces).

---

### 10. Résumé final

Affiche un résumé clair :

- `editionId` traité
- Nombre d'événements rejetés trouvés pour cette édition
- Nombre d'événements **ré-importés** → ajoutés à quel fichier
  - Pour chacun : `shortName.fr` + `venueId` résolu
- Nombre d'événements **toujours rejetés** → laissés dans `reject.json`
  - Pour chacun : `shortName` (ou `_venueRaw`) + raison toujours valable
