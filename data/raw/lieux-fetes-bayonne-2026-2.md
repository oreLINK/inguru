# Lieux des Fêtes de Bayonne 2026 — coordonnées GPS

Les **28 lieux** cités dans le programme, avec leurs coordonnées WGS84 (degrés décimaux, **6 décimales**).

> **Précision & statut.** À 6 décimales, la résolution est d'environ 0,11 m — largement suffisant pour une carte. Deux statuts :
> - **✓ sourcé** — coordonnée issue d'OpenStreetMap / Wikidata-Mérimée / office de tourisme / Mappy (fiable, ~5–10 m près).
> - **≈ estimé** — position déduite par proximité d'un point sourcé voisin (bonne zone, mais à **valider** ; erreur possible ~50–150 m). À finaliser en lançant `geocode-lieux.mjs` (Nominatim), qui remplacera ces valeurs par la géométrie OSM exacte.

| Lieu | Latitude | Longitude | Statut | Source / repère |
| :--- | :--- | :--- | :---: | :--- |
| 10 rue Gosse | 43.490700 | -1.475200 | ≈ | Grand Bayonne, près cathédrale (Choco Yamboun) |
| 4 rue du Moulin | 43.489600 | -1.475600 | ≈ | Grand Bayonne (Estanquet gascon) |
| Arènes de Bayonne | 43.494900 | -1.489920 | ✓ | tourisme64 — av. des Fleurs / Lachepaillet |
| Avenue André Malraux | 43.488500 | -1.471500 | ≈ | secteur sud (tournoi de pétanque) |
| Boulevard Alsace-Lorraine | 43.492800 | -1.471800 | ≈ | axe rive gauche (corso) |
| Carreau des Halles | 43.490000 | -1.475110 | ✓ | OSM way 72697325 — quai Roquebert |
| Cathédrale Sainte-Marie | 43.490530 | -1.477310 | ✓ | OSM way 1176280766 |
| Collégiale Saint-Esprit | 43.495920 | -1.470230 | ✓ | OSM way 72683650 (église Saint-Esprit) |
| DIDAM | 43.495900 | -1.471930 | ✓ | 6 quai de Lesseps, Saint-Esprit (tourisme) |
| Église Saint-André | 43.490700 | -1.470800 | ≈ | 140 m O de la Porte de Mousserolles |
| Fronton du Rail Bayonnais | 43.494700 | -1.469200 | ≈ | rue Tombeloli, au-dessus de place République |
| Fronton du stade Jean-Dauger | 43.485430 | -1.479580 | ✓ | OSM way 504192989 |
| La Nive | 43.490200 | -1.474300 | ≈ | point d'accès (pont Marengo) — rivière, pas un point |
| La Poterne | 43.490600 | -1.478200 | ≈ | Allée de la Poterne, remparts Grand Bayonne |
| Musée Basque | 43.491100 | -1.473870 | ✓ | 37 quai des Corsaires (tourisme) |
| Place de la Liberté | 43.492920 | -1.474880 | ✓ | OSM way 169454702 — Hôtel de ville |
| Place de la République | 43.495590 | -1.469680 | ✓ | OSM way 570446592 |
| Place Jacques Portes | 43.490300 | -1.477200 | ≈ | Grand Bayonne, près Château-Vieux (Karrikaldi) |
| Place Pasteur | 43.490900 | -1.476200 | ≈ | près Place des Cinq Cantons |
| Place Patxa | 43.490160 | -1.472190 | ✓ | OSM way 169694302 |
| Place Paul-Bert | 43.489910 | -1.470770 | ✓ | Mappy — courses de vaches |
| Place Saint-André | 43.490600 | -1.470900 | ≈ | devant l'église Saint-André |
| Porte d'Espagne | 43.487800 | -1.477800 | ≈ | Place de la Porte d'Espagne, près stade J.-Dauger |
| Porte de Mousserolles | 43.490730 | -1.469100 | ✓ | OSM way 935465043 |
| Rue Jacques Laffitte | 43.491700 | -1.472000 | ≈ | Petit Bayonne (Musée Bonnat-Helleu, n°5) |
| Synagogue | 43.497000 | -1.469080 | ✓ | Wikidata / Mérimée — 35 rue Maubec |
| Temple Protestant | 43.490700 | -1.477900 | ≈ | angle rue Albert-1er / rue du Temple |
| Trinquet Jean-Marie Mailharro | 43.490100 | -1.472400 | ≈ | près Place Patxa (Trinquet Saint-André, à confirmer) |

---

**Bilan :** 13 lieux sourcés (✓), 15 estimés (≈). Les estimés sont regroupés dans le cœur historique (Grand/Petit Bayonne, ~150 m les uns des autres) donc l'erreur reste locale. Pour les figer proprement, lance `geocode-lieux.mjs` : il écrasera les ≈ par la géométrie OSM exacte et lèvera un drapeau si un résultat sort de la bbox de Bayonne.

*La Nive et la Porte d'Espagne : « La Nive » est une rivière (parcours pirogue/barques) — le point donné est un accès, pas le lieu réel. « Trinquet Jean-Marie Mailharro » est peut-être le Trinquet Saint-André (Petit Bayonne) — à confirmer sur le terrain.*
