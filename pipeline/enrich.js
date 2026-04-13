/**
 * Étape Gold : catégorisation par keywords, traduction par dictionnaire, format final app.
 *
 * Reçoit le tableau d'événements silver.
 * Écrit data/cities/{cityId}/festivals/{festivalId}/{year}/gold.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Charge un fichier JSON */
function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Traduit un texte via un dictionnaire FR→cible.
 *
 * Algorithme :
 *  - Les entrées sont triées par longueur décroissante pour que les expressions
 *    longues soient remplacées avant leurs sous-termes.
 *  - Le remplacement est insensible à la casse mais préserve la casse de la première lettre.
 *
 * @param {string|null} text
 * @param {Record<string, string>} dict  Dictionnaire {source: cible}
 * @returns {string|null}
 */
function translate(text, dict) {
  if (!text) return null;

  // Trier par longueur décroissante (entrées longues d'abord)
  const entries = Object.entries(dict)
    .filter(([k]) => !k.startsWith('_')) // ignorer les méta-clés comme _doc
    .sort(([a], [b]) => b.length - a.length);

  let result = text;
  for (const [src, tgt] of entries) {
    const pattern = new RegExp(_escapeRegex(src), 'gi');
    // Normaliser tgt en minuscule initiale pour que la préservation de casse
    // soit cohérente quelle que soit la casse de la clé dans le dictionnaire.
    const tgtNorm = tgt.charAt(0).toLowerCase() + tgt.slice(1);
    result = result.replace(pattern, match => {
      // Si la correspondance commence par une majuscule, capitaliser la traduction
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return tgtNorm.charAt(0).toUpperCase() + tgtNorm.slice(1);
      }
      return tgtNorm;
    });
  }
  return result;
}

/** Échappe les caractères spéciaux regex */
function _escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Détermine la catégorie d'un événement par scan de keywords dans le texte.
 *
 * @param {string} title
 * @param {string|null} note
 * @param {Array<{category: string, keywords: string[]}>} categoriesConfig
 * @returns {string} Catégorie, ou "festif" par défaut
 */
function categorize(title, note, categoriesConfig) {
  const text = `${title} ${note || ''}`.toLowerCase();
  for (const { keywords, category } of categoriesConfig) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  return 'festif';
}

/**
 * @param {object[]} silverEvents - Événements normalisés (retour de normalize.js)
 * @param {string} festivalId
 * @param {{ root: string, outDir: string, festival: object }} ctx
 * @returns {Promise<object[]>} Événements gold
 */
export async function enrich(silverEvents, festivalId, { root, outDir, festival }) {
  const esDict = loadJson(join(root, 'dictionaries/es.json'));
  const euDict = loadJson(join(root, 'dictionaries/eu.json'));
  const categoriesConfig = loadJson(join(root, 'dictionaries/categories.json'));

  const gold = silverEvents.map(ev => {
    const category = categorize(ev.title, ev.note, categoriesConfig);

    // Traduction titre, lieu, description
    const title = {
      fr: ev.title,
      es: translate(ev.title, esDict),
      eu: translate(ev.title, euDict),
    };

    const locationName = {
      fr: ev.locationRaw || null,
      es: translate(ev.locationRaw, esDict),
      eu: translate(ev.locationRaw, euDict),
    };

    const description = ev.note
      ? {
          fr: ev.note,
          es: translate(ev.note, esDict),
          eu: translate(ev.note, euDict),
        }
      : null;

    return {
      id: ev.id,
      title,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime || null,
      location: {
        name: locationName,
        lat: ev.lat,
        lng: ev.lng,
        address: ev.address,
      },
      description,
      category,
      image: ev.image || null,
      festivalId,
      cityId: festival.cityId,
    };
  });

  writeFileSync(join(outDir, 'gold.json'), JSON.stringify(gold, null, 2) + '\n', 'utf8');

  return gold;
}
