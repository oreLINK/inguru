/**
 * Étape Silver : parse dates, géocode Nominatim, déduplique, valide JSON Schema.
 *
 * Reçoit le tableau d'événements bruts de scrape.js.
 * Écrit data/cities/{cityId}/festivals/{festivalId}/{year}/silver.json
 *       data/cities/{cityId}/festivals/{festivalId}/{year}/errors.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { parseDate, parseTime } from './lib/date-parser.js';
import { geocode } from './lib/geocoder.js';
import { validate } from './lib/validator.js';

/** Convertit un texte en slug URL-safe */
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Génère un ID déterministe à partir de la date et du titre.
 * Exemple : "2026-04-23-concours-meilleur-jambon-fermier"
 */
function makeId(date, title) {
  const slug = slugify(title).slice(0, 60).replace(/-$/, '');
  return `${date}-${slug}`;
}

/**
 * @param {object[]} rawEvents - Événements bruts (retour de scrape.js)
 * @param {string} festivalId
 * @param {string|number} year
 * @param {{ root: string, outDir: string, festival: object }} ctx
 * @returns {Promise<{ silver: object[], errors: object[] }>}
 */
export async function normalize(rawEvents, festivalId, year, { root, outDir, festival }) {
  // Charger la config YAML pour les aliases et knownLocations
  const configPath = join(root, `config/scrapers/${festivalId}.yaml`);
  const config = parseYaml(readFileSync(configPath, 'utf8'));

  const silverSchema = JSON.parse(
    readFileSync(join(root, 'pipeline/schemas/silver.schema.json'), 'utf8')
  );

  const silver = [];
  const errors = [];
  const seenIds = new Set();

  for (const raw of rawEvents) {
    try {
      // --- Parse date ---
      const date = parseDate(raw._day);
      if (!date) throw new Error(`Date non parsable : "${raw._day}"`);

      // --- Parse horaires ---
      const { startTime, endTime } = parseTime(raw.time_raw);

      // --- Normaliser le lieu ---
      let locationRaw = (raw.location_raw || '').trim();

      // Appliquer les alias de config (variantes → forme canonique)
      const aliases = config.locationAliases || {};
      const locationNormalized = aliases[locationRaw] || locationRaw;

      // Gérer les flèches "lieu A → lieu B" : prendre la destination
      const locationFinal = locationNormalized.includes('→')
        ? locationNormalized.split('→').pop().trim()
        : locationNormalized;

      const locationSlug = slugify(locationFinal);

      // --- Géocoder ---
      const geo = await geocode(locationFinal, {
        knownLocations: config.knownLocations || {},
        fallback: config.fallbackCoords,
        city: festival.cityName || festival.cityId,
      });

      // --- Construire l'événement silver ---
      const title = raw.title_raw || '';
      const baseId = makeId(date, title);

      // Déduplication : ajouter l'index si l'ID existe déjà
      let id = baseId;
      if (seenIds.has(id)) {
        id = `${baseId}-${raw._index}`;
      }
      seenIds.add(id);

      const event = {
        id,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        title,
        note: raw.note || null,
        priceRaw: raw.price_raw || null,
        locationRaw,
        locationSlug,
        lat: geo.lat,
        lng: geo.lng,
        address: geo.address || null,
        sourceUrl: raw._sourceUrl,
        scrapedAt: raw._scrapedAt,
      };

      // --- Valider contre le schéma silver ---
      const result = validate(event, silverSchema);
      if (result.ok) {
        silver.push(event);
      } else {
        errors.push({ event, validationErrors: result.errors });
      }
    } catch (err) {
      errors.push({ raw, error: err.message });
    }
  }

  // Trier par date puis startTime (ordre chronologique)
  silver.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  writeFileSync(join(outDir, 'silver.json'), JSON.stringify(silver, null, 2) + '\n', 'utf8');
  writeFileSync(join(outDir, 'errors.json'), JSON.stringify(errors, null, 2) + '\n', 'utf8');

  return { silver, errors };
}
