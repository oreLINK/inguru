#!/usr/bin/env node
/**
 * Scraper Fêtes de Bayonne — enrichissement des descriptions.
 *
 * Pipeline :
 *   1. Fetch la page listing → parse les 163 events (jour, heure début/fin, nom, lieu, url).
 *   2. Fetch chaque page event → extrait la description (meta-description + ordre du jour).
 *   3. Écrit  events.gold.json  (données app-ready) et  programme-fetes-bayonne-2026.md.
 *
 * Usage :
 *   npm i cheerio
 *   node scraper-descriptions.mjs
 *
 * Node >= 18 (fetch natif). Politesse : ~350 ms entre chaque requête.
 */

import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";

const BASE = "https://fetes.bayonne.fr";
const LISTING = `${BASE}/informations-transversales/tout-le-programme`;
const DELAY_MS = 350;
const UA =
  "Mozilla/5.0 (compatible; InguruBot/1.0; +https://github.com/) FetesBayonne-scraper";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.text();
}

/** "08H15" -> "08:15" | "09H" -> "09:00" | null -> null */
function normTime(raw) {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})H(\d{0,2})/i);
  if (!m) return null;
  const h = m[1].padStart(2, "0");
  const min = (m[2] || "00").padEnd(2, "0");
  return `${h}:${min}`;
}

/* ------------------------------------------------------------------ *
 * 1. Parse du listing
 * ------------------------------------------------------------------ */
function parseListing(html) {
  const $ = cheerio.load(html);
  const events = [];
  let currentDay = null;

  // Parcours du contenu principal dans l'ordre du document.
  // Les jours sont des <h2> ("Mercredi 15 juillet , Journée ouverture"),
  // les events des <h3> contenant un <a href=".../tout-le-programme/<slug>-<id>">.
  $("h2, h3").each((_, el) => {
    const $el = $(el);

    if (el.tagName === "h2") {
      const txt = $el.text().replace(/\s+/g, " ").trim();
      // On ne garde que les entêtes de type "Jour <date> juillet"
      if (/juillet/i.test(txt)) currentDay = txt.replace(/\s*,\s*/, " — ");
      return;
    }

    // h3 event
    const $a = $el.find('a[href*="/tout-le-programme/"]').first();
    const href = $a.attr("href");
    if (!href || !/-\d+$/.test(href)) return; // exige un id numérique en fin d'url

    const name = $a.text().replace(/\s+/g, " ").trim();
    if (!name) return;

    // Le bloc horaire + lieu suit le <h3>. On agrège le texte des noeuds
    // suivants jusqu'au prochain h3/h2.
    let blockText = "";
    let node = $el.next();
    while (node.length && !/^h[23]$/i.test(node.get(0).tagName || "")) {
      blockText += " " + node.text();
      node = node.next();
    }
    blockText = blockText.replace(/\s+/g, " ").trim();

    const timeMatch = blockText.match(
      /de\s*(\d{1,2}H\d{0,2})(?:\s*à\s*(\d{1,2}H\d{0,2}))?/i
    );
    const start = normTime(timeMatch?.[1]);
    const end = normTime(timeMatch?.[2]);

    // Lieu : dernier segment "... - Bayonne" (le site écrit parfois "Bayone").
    const locMatch = blockText.match(/([^—|]+?)\s*-\s*Bayonn?e\b/i);
    const location = locMatch ? locMatch[1].replace(/\s+/g, " ").trim() : null;

    events.push({
      day: currentDay,
      start,
      end,
      name,
      location,
      url: href.startsWith("http") ? href : BASE + href,
      description: null,
    });
  });

  return events;
}

/* ------------------------------------------------------------------ *
 * 2. Extraction de la description sur une page event
 * ------------------------------------------------------------------ */
function extractDescription(html) {
  const $ = cheerio.load(html);

  // Source primaire : meta description (toujours présente, propre).
  let desc =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  desc = desc.replace(/\s+/g, " ").trim();

  // Bonus : "ordre du jour" détaillé (liste à puces après le corps).
  const bullets = [];
  $("main li, .news-text-wrap li, article li").each((_, li) => {
    const t = $(li).text().replace(/\s+/g, " ").trim();
    // Garde les lignes horodatées type "17h10 : Mascleta"
    if (/^\d{1,2}h\d{0,2}\b/i.test(t)) bullets.push(t);
  });

  if (bullets.length) {
    const schedule = bullets.join(" ; ");
    desc = desc ? `${desc} ${schedule}.` : `${schedule}.`;
  }
  return desc || null;
}

/* ------------------------------------------------------------------ *
 * 3. Rendu Markdown
 * ------------------------------------------------------------------ */
function toMarkdown(events) {
  const byDay = new Map();
  for (const e of events) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day).push(e);
  }

  let md = `# Programme des Fêtes de Bayonne 2026\n\n`;
  md += `Ce document détaille la programmation complète des Fêtes de Bayonne 2026, organisée par jour et par heure de début.\n\n`;
  md += `**Source :** [fetes.bayonne.fr — Tout le programme](${LISTING}) (${events.length} events).\n\n---\n\n`;

  const esc = (s) => (s ? s.replace(/\|/g, "\\|") : "—");

  for (const [day, list] of byDay) {
    md += `## ${day || "Jour inconnu"}\n\n`;
    md += `| Début | Fin | Événement | Lieu | Description |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const e of list) {
      md += `| ${e.start || "—"} | ${e.end || "—"} | **${esc(e.name)}** | ${esc(
        e.location
      )} | ${esc(e.description)} |\n`;
    }
    md += `\n---\n\n`;
  }
  return md;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */
async function main() {
  console.log("→ Fetch listing…");
  const listingHtml = await getHtml(LISTING);
  const events = parseListing(listingHtml);
  console.log(`  ${events.length} events détectés.`);

  console.log("→ Enrichissement des descriptions…");
  let ok = 0;
  for (const [i, e] of events.entries()) {
    try {
      const html = await getHtml(e.url);
      e.description = extractDescription(html);
      if (e.description) ok++;
    } catch (err) {
      console.warn(`  ⚠ ${e.name}: ${err.message}`);
    }
    process.stdout.write(`\r  ${i + 1}/${events.length}`);
    await sleep(DELAY_MS);
  }
  console.log(`\n  ${ok} descriptions récupérées.`);

  await writeFile("events.gold.json", JSON.stringify(events, null, 2), "utf8");
  await writeFile("programme-fetes-bayonne-2026.md", toMarkdown(events), "utf8");
  console.log("✓ Écrit : events.gold.json + programme-fetes-bayonne-2026.md");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
