```
Récupère le contenu de cette page : {URL}

À partir des informations trouvées, produis un fichier JSON au format bronze Inguru selon la structure ci-dessous.

---

### Règles d'extraction

**Identification**
- Détermine le nom de la ville (ex: `bayonne`), le slug de la feria (ex: `foire-jambon`), et l'année de l'édition (ex: `2026`).
- Tous les noms de ville et slugs de feria sont en minuscules, sans accents, avec des tirets à la place des espaces.

**Événements**
- Organise les événements par jour dans `events_raw`, avec la clé `"day"` en texte brut tel qu'écrit sur la page (ex: `"Jeudi 23 Avril 2026"`).
- Pour chaque événement, extrait :
  - `time_raw` : horaire brut tel qu'écrit sur la page (ex: `"9h30 à 11h30"`, `"11h"`, `"6h à 13h"`)
  - `location_raw` : lieu brut tel qu'écrit sur la page
  - `title_raw` : intitulé brut de l'événement
  - `price_raw` : si mentionné, tarif brut (ex: `"entrée 10 € (gratuit moins de 16 ans)"`) — omets ce champ si gratuit/non mentionné
  - `note` : toute précision contextuelle importante — omets ce champ si absent
  - `contact_raw` : si un contact (téléphone, email) est mentionné — omets ce champ si absent
  - `theme_raw` : si un thème ou sous-titre est précisé — omets ce champ si absent

**Animations récurrentes**
- Si des animations sont présentes sur plusieurs jours (ex: ferme, chapiteaux, village…), ne les mets PAS dans un bloc `recurring_animations`.
- Intègre-les directement dans chaque journée concernée avec leurs horaires exacts pour ce jour-là.
- Si les horaires varient entre les jours (ex: fermeture anticipée le dimanche), adapte `time_raw` en conséquence pour chaque jour.

**Métadonnées**
- `_source` : l'URL fournie
- `_scraped_at` : la date du jour au format `YYYY-MM-DD`
- `_note` : mentionne si le programme est partiel, provisoire ou basé sur une édition précédente
- `edition` : numéro et année de l'édition si disponible (ex: `"563e (2026)"`)
- `dates_raw` : dates de la feria telles qu'écrites sur la page

---

### Format JSON attendu

```json
{
  "_source": "https://...",
  "_scraped_at": "YYYY-MM-DD",
  "_note": "...",
  "edition": "...",
  "dates_raw": "...",
  "events_raw": [
    {
      "day": "Jeudi XX Mois YYYY",
      "events": [
        {
          "time_raw": "...",
          "location_raw": "...",
          "title_raw": "..."
        }
      ]
    }
  ]
}
```

---

### Chemin et nom du fichier

Place le fichier à cet emplacement dans le repo Inguru :

```
data/01_bronze/02_ferias/{ville}/{feria-slug}/{année}/{ville}-{feria-slug}-{année}-events-raw.json
```

Exemple pour la Foire au Jambon de Bayonne 2026 :
```
data/01_bronze/02_ferias/bayonne/foire-jambon/2026/bayonne-foire-jambon-2026-events-raw.json
```