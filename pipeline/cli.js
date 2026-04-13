#!/usr/bin/env node
/**
 * CLI du pipeline d'ingestion Inguru.
 *
 * Usage:
 *   node pipeline/cli.js <festivalId> <year>
 *   node pipeline/cli.js --all [year]
 *   npm run ingest -- foire-jambon 2026
 *   npm run ingest -- --all 2026
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrape } from './scrape.js';
import { normalize } from './normalize.js';
import { enrich } from './enrich.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- Couleurs ANSI ---
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

function log(level, msg) {
  const prefix = {
    info:  `${C.cyan}ℹ${C.reset}`,
    ok:    `${C.green}✓${C.reset}`,
    warn:  `${C.yellow}⚠${C.reset}`,
    error: `${C.red}✗${C.reset}`,
    step:  `${C.gray}›${C.reset}`,
  }[level] ?? ' ';
  console.log(`  ${prefix} ${msg}`);
}

function hr() {
  console.log(`${C.dim}${'─'.repeat(50)}${C.reset}`);
}

/**
 * Exécute le pipeline complet pour un festival/année.
 * @param {object} festival - Entrée de config/festivals.json
 * @param {string|number} year
 */
async function runPipeline(festival, year) {
  const outDir = join(
    ROOT,
    `data/bronze/ferias/${festival.cityId}/${festival.id}/${year}`
  );

  hr();
  console.log(`\n  ${C.bold}${festival.name}${C.reset} ${C.cyan}${year}${C.reset}`);
  console.log(`  ${C.gray}→ ${outDir}${C.reset}\n`);

  // 1. Bronze : scraping
  log('step', `[1/3] ${C.bold}Scraping${C.reset} (Cheerio/Playwright)…`);
  const rawEvents = await scrape(festival.id, year, { root: ROOT, outDir });
  log('ok', `Bronze : ${rawEvents.length} événements bruts → bronze.json`);

  if (rawEvents.length === 0) {
    log('warn', 'Aucun événement extrait. Vérifier les sélecteurs CSS dans config/scrapers/.');
    return { silver: [], gold: [] };
  }

  // 2. Silver : normalisation
  log('step', `[2/3] ${C.bold}Normalisation${C.reset} (dates + géocodage)…`);
  const { silver, errors } = await normalize(rawEvents, festival.id, year, {
    root: ROOT,
    outDir,
    festival,
  });
  log('ok', `Silver : ${silver.length} événements valides → silver.json`);
  if (errors.length > 0) {
    log('warn', `${errors.length} événement(s) rejeté(s) → errors.json`);
  }

  // 3. Gold : enrichissement
  log('step', `[3/3] ${C.bold}Enrichissement${C.reset} (catégories + traductions)…`);
  const gold = await enrich(silver, festival.id, { root: ROOT, outDir, festival });
  log('ok', `Gold : ${gold.length} événements → gold.json`);

  console.log('');
  log('ok', `${C.green}${C.bold}Terminé !${C.reset} ${festival.name} ${year}`);

  return { silver, gold };
}

// --- Point d'entrée ---

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
${C.bold}Pipeline Inguru${C.reset}

Usage:
  node pipeline/cli.js ${C.cyan}<festivalId> <year>${C.reset}
  node pipeline/cli.js ${C.cyan}--all [year]${C.reset}

Exemples:
  node pipeline/cli.js foire-jambon 2026
  node pipeline/cli.js --all 2026
  npm run ingest -- foire-jambon 2026

Festivals disponibles : voir ${C.cyan}config/festivals.json${C.reset}
  `);
  process.exit(0);
}

const festivals = JSON.parse(readFileSync(join(ROOT, 'config/festivals.json'), 'utf8'));

if (args.includes('--all')) {
  // Exécuter tous les festivals pour l'année donnée (ou l'année courante)
  const year = args.find(a => /^\d{4}$/.test(a)) || String(new Date().getFullYear());
  console.log(`\n${C.bold}Pipeline --all${C.reset} | Année ${year}`);

  for (const festival of festivals) {
    await runPipeline(festival, year).catch(err => {
      log('error', `${C.red}${festival.id} : ${err.message}${C.reset}`);
      if (process.env.DEBUG) console.error(err);
    });
  }
} else {
  const [festivalId, year] = args;

  if (!festivalId || !year) {
    console.error(`${C.red}✗ Arguments manquants.${C.reset} Usage: node pipeline/cli.js <festivalId> <year>`);
    process.exit(1);
  }

  const festival = festivals.find(f => f.id === festivalId);
  if (!festival) {
    const ids = festivals.map(f => f.id).join(', ');
    console.error(`${C.red}✗ Festival inconnu : "${festivalId}"${C.reset}\n  Disponibles : ${ids}`);
    process.exit(1);
  }

  await runPipeline(festival, year).catch(err => {
    console.error(`\n${C.red}✗ Erreur : ${err.message}${C.reset}`);
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  });
}
