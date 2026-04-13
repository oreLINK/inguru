/**
 * Géocodeur Nominatim (OpenStreetMap).
 *
 * Respect de la politique d'usage :
 *   - User-Agent obligatoire
 *   - Maximum 1 requête / seconde
 *   - Cache mémoire pour éviter les doublons
 *
 * Priorité de résolution :
 *   1. knownLocations (config YAML) — pas d'appel réseau
 *   2. Cache mémoire — pas d'appel réseau
 *   3. Nominatim API
 *   4. fallbackCoords — si l'API ne retourne rien
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1100; // ≥ 1 req/s selon les CGU Nominatim

const cache = new Map();
let lastRequestAt = 0;

/**
 * Géocode un nom de lieu.
 *
 * @param {string} locationName - Nom du lieu à géocoder
 * @param {object} options
 * @param {Record<string, {lat: number, lng: number, address: string}>} [options.knownLocations]
 * @param {{lat: number, lng: number}} [options.fallback]
 * @param {string} [options.city] - Ville ajoutée à la requête pour affiner
 * @returns {Promise<{lat: number, lng: number, address: string|null}>}
 */
export async function geocode(locationName, { knownLocations = {}, fallback, city = '' } = {}) {
  if (!locationName) {
    if (fallback) return { ...fallback, address: null };
    throw new Error('Nom de lieu manquant et aucun fallback défini');
  }

  // 1. Lieux pré-définis dans le config YAML (zéro appel réseau)
  if (knownLocations[locationName]) {
    return knownLocations[locationName];
  }

  // 2. Cache mémoire
  const cacheKey = city ? `${locationName}||${city}` : locationName;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // 3. Appel Nominatim (avec throttle)
  const query = city ? `${locationName}, ${city}` : locationName;
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    addressdetails: '1',
  });

  await _throttle();

  try {
    const resp = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'inguru-pipeline/1.0 (festival events PWA; contact: github.com/inguru)',
        'Accept-Language': 'fr',
      },
    });

    if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);

    const results = await resp.json();

    if (results.length > 0) {
      const r = results[0];
      const geo = {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        address: r.display_name || null,
      };
      cache.set(cacheKey, geo);
      return geo;
    }
  } catch (err) {
    // Nominatim indisponible ou pas de résultat : on tombe sur le fallback
    console.warn(`  ⚠ Géocodage échoué pour "${locationName}": ${err.message}`);
  }

  // 4. Fallback
  if (fallback) {
    return { lat: fallback.lat, lng: fallback.lng, address: null };
  }

  throw new Error(`Impossible de géocoder "${locationName}" et aucun fallback défini`);
}

/** Attend si nécessaire pour respecter la limite 1 req/s */
async function _throttle() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();
}
