---
description: Vérifie et corrige les fichiers JSON de lieux d'une ville. Remplie les champs devinables absents (id, name.es, name.eu). Signale les champs non devinables manquants (coords). Utiliser avec /clean-places <CITYID>.
---

# clean-places

Vérifie la conformité des fichiers `data/places/{CITYID}*.json` par rapport au template, corrige les champs devinables manquants, et rapporte l'état final dans le chat.

## Arguments

`$ARGUMENTS` — format attendu : `<CITYID>` en majuscules (ex. `PAM`, `BAY`, `DAX`)

Si l'argument est absent ou mal formé, rappelle la syntaxe et arrête.

---

## Étapes à suivre

### 1. Analyser les arguments

- **Premier mot** = `CITYID` (ex. `PAM`)
- Valider le format : 2–4 lettres majuscules
- Si invalide → expliquer la syntaxe et arrêter

---

### 2. Lire le template

Lis `data/places/template.md` pour rappeler les règles.

Rappel des champs et leur statut :

| Champ | Obligatoire | Devinable |
|-------|-------------|-----------|
| `cityId` (racine) | ✅ | ✅ égal au `CITYID` fourni |
| `id` | ✅ | ✅ slug depuis `name.fr` préfixé `{CITYID}-` |
| `name.fr` | ✅ | ❌ doit être présent |
| `name.es` | facultatif | ✅ copie de `name.fr` si absent |
| `name.eu` | facultatif | ✅ copie de `name.fr` si absent |
| `coords.lat` | ✅ | ❌ doit être présent et numérique |
| `coords.lng` | ✅ | ❌ doit être présent et numérique |

---

### 3. Trouver les fichiers à traiter

Cherche tous les fichiers correspondant au pattern `data/places/{CITYID}*.json` (ex. `PAM.json`, `PAM-2.json`, `PAM-3.json`).

- Si aucun fichier trouvé → afficher un message d'erreur et arrêter
- Traiter **tous** les fichiers trouvés, l'un après l'autre

---

### 4. Analyser et corriger chaque fichier

Pour chaque fichier trouvé, lis-le entièrement, puis pour chaque place :

#### 4a. Vérifier `cityId` racine

- Si `cityId` absent ou différent de `$ARGUMENTS` → le corriger (c'est devinable)

#### 4b. Vérifier chaque place

Pour chaque objet dans le tableau `places` :

**Champs devinables — corriger silencieusement si absent :**

- `id` absent ou vide → générer le slug depuis `name.fr` :
  - Retirer les accents (é→e, à→a, ñ→n, ç→c, etc.)
  - Remplacer espaces et caractères spéciaux par `-`
  - Passer en MAJUSCULES
  - Préfixer avec `{CITYID}-`
  - Exemple : `"Plaza de la Libertad"` → `"PAM-PLAZA-DE-LA-LIBERTAD"`

- `name.es` absent ou vide → copier la valeur de `name.fr`

- `name.eu` absent ou vide → copier la valeur de `name.fr`

**Champs non devinables — signaler si absent/invalide :**

- `name.fr` absent ou vide → **place invalide**, noter le problème
- `coords.lat` absent, null, ou non numérique → **champ manquant**, noter le problème
- `coords.lng` absent, null, ou non numérique → **champ manquant**, noter le problème

**Champs parasites à ignorer :**

- Si la place contient `_source` ou `_reason` (ce sont des marqueurs de reject.json copiés par erreur), les retirer du fichier places.

#### 4c. Réécrire le fichier corrigé

Si des corrections ont été apportées (champs devinables remplis, champs parasites retirés), **réécrire le fichier** avec le JSON corrigé, formaté proprement (indentation 2 espaces).

Si aucune correction nécessaire → ne pas toucher au fichier.

---

### 5. Rapport final dans le chat

Pour chaque fichier traité, afficher un tableau récapitulatif :

```
## Rapport clean-places — {CITYID}

### {CITYID}.json — {N} places
| Place (id) | name.fr | name.es | name.eu | coords.lat | coords.lng | Corrections |
|------------|---------|---------|---------|------------|------------|-------------|
| PAM-PLAZA-CASTILLO | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| PAM-ESTAFETA | ✅ | ✅ | ⚠️ rempli | ✅ | ✅ | name.eu |
| PAM-LIEU-X | ✅ | ✅ | ✅ | ❌ manquant | ❌ manquant | — |
```

Légende :
- ✅ = présent et valide
- ⚠️ = absent → corrigé automatiquement (indiquer ce qui a été rempli)
- ❌ = absent et non devinable → intervention manuelle requise

Terminer par un résumé global :
- Nombre total de places
- Nombre de corrections appliquées automatiquement
- Nombre de champs ❌ nécessitant une intervention manuelle (avec la liste des places concernées)
