# Template — Fichiers de fêtes (`data/fetes/`)

## Fichier

| Propriété | Valeur |
|-----------|--------|
| Nom | `{FETEFILEID}.json` — ex. `BAY-FDB.json`, `PAM-SFM.json` |
| Emplacement | `data/fetes/` |
| Encodage | UTF-8, JSON valide |

Un fichier par fête (invariant entre les éditions). Les données communes à toutes les éditions d'une même fête (couleurs, services, anims) y sont stockées.

Structure racine :

```json
{
  "id": "fetes-bayonne",
  "cityId": "BAY",
  "name": { "fr": "Fêtes de Bayonne", "es": "Fiestas de Bayona", "eu": "Baionako Festak" },
  "website": "https://fetes.bayonne.fr",
  "theme": { "primary": "#e63012", "secondary": "#ffffff" },
  "services": [],
  "anims": []
}
```

---

## Tableau des champs

| Champ | Obligatoire | Facultatif | Devinable | Non devinable |
|-------|-------------|------------|-----------|---------------|
| `id` | ✅ | | | ✅ slug descriptif figé — ne jamais modifier |
| `cityId` | ✅ | | ✅ dérivé du nom du fichier | |
| `name.fr` | ✅ | | | ✅ doit figurer dans la source |
| `name.es` | | ✅ | ✅ copie de `name.fr` si absent | |
| `name.eu` | | ✅ | ✅ copie de `name.fr` si absent | |
| `website` | | ✅ | | |
| `theme.primary` | ✅ | | | ✅ couleur principale (hex) |
| `theme.secondary` | ✅ | | | ✅ couleur secondaire (hex) |
| `services` | | ✅ | | |
| `anims` | | ✅ | | |

---

## Champ `id`

| Propriété | Valeur |
|-----------|--------|
| Type | string |
| Format | slug descriptif libre en minuscules, mots séparés par des tirets |
| Contrainte | **Ne jamais modifier** — référencé dans `app.json` (themes, features) |

```
"id": "fetes-bayonne"    ← Fêtes de Bayonne (BAY-FDB)
"id": "san-fermin"       ← Sanfermines (PAM-SFM)
"id": "ferias-dax"       ← Ferias de Dax (DAX-FER)
"id": "foire-jambon"     ← Foire au Jambon (BAY-FJB)
```

> Le `id` interne est différent du `FETEFILEID` utilisé pour nommer le fichier.

---

## Champ `cityId`

| Propriété | Valeur |
|-----------|--------|
| Type | string |
| Format | 2–4 lettres majuscules — identifiant ISO de la ville |

```
"cityId": "BAY"   ← Bayonne
"cityId": "PAM"   ← Pampelune
"cityId": "DAX"   ← Dax
"cityId": "MDM"   ← Mont-de-Marsan
```

---

## Champ `name`

- Nom officiel de la fête dans les 3 langues : `fr`, `es`, `eu`
- Si une traduction est introuvable : répéter la valeur `fr`

```json
"name": { "fr": "Fêtes de Bayonne", "es": "Fiestas de Bayona", "eu": "Baionako Festak" }
"name": { "fr": "Fêtes de San Fermín", "es": "Sanfermines", "eu": "San Ferminak" }
```

---

## Champ `website`

URL officielle de la fête. Facultatif si indisponible.

```json
"website": "https://fetes.bayonne.fr"
"website": "https://www.sanfermin.com"
```

---

## Champ `theme`

Couleurs officielles de la fête utilisées pour l'habillage de l'app.

| Champ | Type | Format |
|-------|------|--------|
| `primary` | string | code hexadécimal CSS — ex. `"#e63012"` |
| `secondary` | string | code hexadécimal CSS — ex. `"#ffffff"` |

```json
"theme": { "primary": "#e63012", "secondary": "#ffffff" }   ← rouge/blanc (Bayonne, Pampelune)
"theme": { "primary": "#e63012", "secondary": "#f5c400" }   ← rouge/jaune (Dax)
```

---

## Champs `services` et `anims`

Tableaux facultatifs, vides `[]` par défaut si non renseignés.

- `services` : services pratiques associés à la fête (parkings, navettes, etc.)
- `anims` : animations récurrentes non liées à une édition spécifique
