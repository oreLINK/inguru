/**
 * Parsing de dates et d'horaires en français.
 *
 * Gère les formats courants des programmes de festivals :
 *   - Dates : "Jeudi 23 Avril 2026"
 *   - Heures : "9h30", "10h", "9h30 à 11h30", "9h-12h et 13h-19h",
 *              "à partir de 20h30", "ouverture 19h30"
 */

const MOIS_FR = {
  janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04',
  mai: '05', juin: '06', juillet: '07', août: '08', aout: '08',
  septembre: '09', octobre: '10', novembre: '11', décembre: '12', decembre: '12',
};

/**
 * Parse une date française : "Jeudi 23 Avril 2026" → "2026-04-23"
 * @param {string} dayStr
 * @returns {string|null} format ISO YYYY-MM-DD, ou null si non parsable
 */
export function parseDate(dayStr) {
  if (!dayStr) return null;
  const parts = dayStr.trim().split(/\s+/);
  // Format attendu: [Jour_semaine, Jour_numéro, Mois, Année]
  if (parts.length < 4) return null;

  const [, dayNum, monthStr, yearStr] = parts;
  const month = MOIS_FR[monthStr.toLowerCase()];
  if (!month) return null;

  const year = parseInt(yearStr, 10);
  const day = parseInt(dayNum, 10);
  if (isNaN(year) || isNaN(day)) return null;

  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse un horaire : retourne { startTime, endTime } en format "HH:MM".
 *
 * Exemples :
 *   "9h30"            → { startTime: "09:30", endTime: null }
 *   "9h30 à 11h30"    → { startTime: "09:30", endTime: "11:30" }
 *   "9h-12h et 13h-19h" → { startTime: "09:00", endTime: "19:00" }
 *   "à partir de 20h30" → { startTime: "20:30", endTime: null }
 *
 * @param {string|null} timeStr
 * @returns {{ startTime: string|null, endTime: string|null }}
 */
export function parseTime(timeStr) {
  if (!timeStr) return { startTime: null, endTime: null };

  // Supprimer les préfixes courants
  let s = timeStr
    .replace(/^à partir de\s+/i, '')
    .replace(/^dès\s+/i, '')
    .replace(/^ouverture\s*/i, '')
    .replace(/^de\s+/i, '')
    .trim();

  // Cas "9h-12h et 13h-19h" : prendre début du premier et fin du dernier
  if (/ et /.test(s) && s.includes('-')) {
    const segments = s.split(/ et /);
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const start = _parseSegmentStart(firstSegment);
    const end = _parseSegmentEnd(lastSegment);
    return { startTime: start, endTime: end };
  }

  // Cas "9h30 à 11h30" (séparateur "à")
  if (/ à /.test(s)) {
    const [left, right] = s.split(/ à /);
    return { startTime: _parseOneTime(left), endTime: _parseOneTime(right) };
  }

  // Cas "9h-12h" (séparateur "-" sans espace)
  if (/-/.test(s) && /h/.test(s)) {
    const [left, right] = s.split(/-/);
    return { startTime: _parseOneTime(left), endTime: _parseOneTime(right) };
  }

  // Cas simple : une seule heure
  return { startTime: _parseOneTime(s), endTime: null };
}

/** Parse le début d'un segment "9h-12h" → "09:00" */
function _parseSegmentStart(seg) {
  return _parseOneTime(seg.split('-')[0]);
}

/** Parse la fin d'un segment "9h-12h" → "12:00" */
function _parseSegmentEnd(seg) {
  const parts = seg.split('-');
  return _parseOneTime(parts[parts.length - 1]);
}

/**
 * Convertit "9h30", "10h", "21h45" → "09:30", "10:00", "21:45"
 * @param {string} s
 * @returns {string|null}
 */
function _parseOneTime(s) {
  if (!s) return null;
  s = s.trim();
  if (!s.includes('h')) return null;

  const [hPart, mPart] = s.split('h');
  const h = parseInt(hPart, 10);
  const m = parseInt(mPart || '0', 10);

  if (isNaN(h) || h < 0 || h > 23) return null;
  if (isNaN(m) || m < 0 || m > 59) return null;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
