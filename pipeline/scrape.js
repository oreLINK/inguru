/**
 * Étape Bronze : fetch HTML + extraction via sélecteurs CSS (Cheerio).
 *
 * Lit la config dans config/scrapers/{festivalId}.yaml.
 * Écrit data/cities/{cityId}/festivals/{festivalId}/{year}/bronze.json
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import * as cheerio from 'cheerio';

/**
 * @param {string} festivalId
 * @param {string|number} year
 * @param {{ root: string, outDir: string }} ctx
 * @returns {Promise<object[]>} Tableau d'événements bruts (à passer à normalize)
 */
export async function scrape(festivalId, year, { root, outDir }) {
  // Charger la config YAML du scraper
  const configPath = join(root, `config/scrapers/${festivalId}.yaml`);
  const config = parseYaml(readFileSync(configPath, 'utf8'));

  // Construire l'URL (supporte le placeholder {year})
  const url = (config.urlPattern || config.url).replace('{year}', String(year));

  // Récupérer le HTML
  const html = await _fetchHtml(url, config.engine || 'cheerio');
  const $ = cheerio.load(html);

  const { selectors } = config;
  const events = [];
  const scrapedAt = new Date().toISOString().split('T')[0];

  // Parcourir les blocs par jour
  $(selectors.dayBlock).each((_, dayEl) => {
    // Chercher le titre du jour à l'intérieur du bloc, ou dans l'élément précédent
    const $day = $(dayEl);
    let dayText = $day.find(selectors.dayTitle).first().text().trim();
    if (!dayText) {
      dayText = $day.prevAll(selectors.dayTitle).first().text().trim();
    }
    if (!dayText) return; // bloc sans titre de jour identifiable → ignorer

    // Parcourir les événements du jour
    $day.find(selectors.eventItem).each((idx, evEl) => {
      const $ev = $(evEl);

      const titleRaw = $ev.find(selectors.eventTitle).first().text().trim();
      if (!titleRaw) return; // événement sans titre → ignorer

      const raw = {
        _day: dayText,
        _sourceUrl: url,
        _scrapedAt: scrapedAt,
        _index: events.length,
        time_raw: $ev.find(selectors.eventTime).first().text().trim() || null,
        location_raw: $ev.find(selectors.eventLocation).first().text().trim() || null,
        title_raw: titleRaw,
        note: selectors.eventNote
          ? ($ev.find(selectors.eventNote).first().text().trim() || null)
          : null,
        price_raw: selectors.eventPrice
          ? ($ev.find(selectors.eventPrice).first().text().trim() || null)
          : null,
      };

      events.push(raw);
    });
  });

  // Écrire bronze.json
  mkdirSync(outDir, { recursive: true });
  const bronze = {
    _source: url,
    _scraped_at: scrapedAt,
    _festival_id: festivalId,
    _year: Number(year),
    events_raw: events,
  };
  writeFileSync(join(outDir, 'bronze.json'), JSON.stringify(bronze, null, 2) + '\n', 'utf8');

  return events;
}

/** Récupère le HTML d'une URL, avec Cheerio (fetch natif) ou Playwright */
async function _fetchHtml(url, engine) {
  if (engine === 'playwright') {
    // Import lazy : Playwright est une dépendance optionnelle
    const { chromium } = await import('playwright').catch(() => {
      throw new Error(
        'Playwright non installé. Installez-le avec: npm install playwright && npx playwright install chromium'
      );
    });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    await browser.close();
    return html;
  }

  // Moteur par défaut : fetch natif (Node 18+)
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'inguru-pipeline/1.0 (festival events PWA)',
      'Accept': 'text/html',
    },
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${url}`);
  }

  return resp.text();
}
