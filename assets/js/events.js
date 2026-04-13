/**
 * events.js – Chargement et filtrage
 *
 * Structure de données :
 *   data/editions.json       → liste des éditions { id, isDisplay }
 *   data/app.json            → config globale (settings, categories, themes, serviceTypes, features)
 *   data/gold/{id}.json      → bundle "édition" (town + feria + dates + lieux + events)
 */
const Events = {
  town:           null,
  feria:          null,
  edition:        null,
  venues:         [],
  events:         [],
  services:       [],
  serviceTypes:   [],
  anims:          [],

  config:         null,
  dominantColors: {},
  categories:     {},   // map id → color

  // ─── Chargement de la config globale ─────────────────────────────
  async loadConfig() {
    const res = await fetch('data/app.json');
    if (!res.ok) throw new Error('Impossible de charger data/app.json');
    const app = await res.json();

    this.config       = app.settings      ?? {};
    this.dominantColors = app.themes      ?? {};
    this.categories   = Object.fromEntries((app.categories ?? []).map(c => [c.id, c.color]));
    this.serviceTypes = app.serviceTypes  ?? [];
    Features.load(app.features ?? {});

    return this.config;
  },

  // ─── Chargement de l'index des éditions ──────────────────────────
  async loadIndex() {
    const res = await fetch('data/editions.json');
    if (!res.ok) throw new Error('Impossible de charger data/editions.json');
    return res.json();
  },

  /**
   * Charge toutes les données d'une édition depuis data/gold/{id}.json.
   * Retourne un objet `meta` complet pour l'affichage (fusion town + feria + edition).
   *
   * @param {object} ref  Entrée de l'index : { id, isDisplay }
   */
  async load(ref) {
    const bundlePath = `data/gold/${ref.id}.json`;
    const res = await fetch(bundlePath);
    if (!res.ok) throw new Error(`Fichier manquant : ${bundlePath}`);

    const bundle = await res.json();
    this.town         = bundle.town ?? null;
    this.feria        = bundle.feria ?? null;
    this.edition      = bundle.edition ?? null;
    this.venues       = bundle.places ?? [];
    this.events       = bundle.events ?? [];
    this.services     = bundle.services ?? [];
    this.anims        = bundle.anims    ?? [];

    if (!this.town || !this.feria || !this.edition)
      throw new Error(`Bundle invalide : ${bundlePath}`);

    // Objet meta fusionné pour l'affichage
    const meta = this._buildMeta(ref);
    return meta;
  },

  /**
   * Construit l'objet meta complet depuis les données chargées + la ref de l'index.
   * Cet objet est utilisé par app.js pour l'affichage (thème, dates, nom…).
   */
  _buildMeta(ref) {
    return {
      id:          ref.id,
      // Nom : de la feria, affiché avec la town
      name:        this.feria.name,
      town:        this.town.name,
      // Données géographiques depuis la town
      center:      this.town.center,
      category:    this.town.category,
      // Thème : priorité au fichier events_dominant_colors.json, sinon feria.theme
      theme:       this.dominantColors[this.feria.id] ?? this.feria.theme,
      // Données de l'édition
      dates:       this.edition.dates,
      defaultZoom: this.edition.defaultZoom ?? this.config?.defaultZoom ?? 16,
      website:     this.feria.website ?? null,
    };
  },

  // ─── Sélection de la feria active ─────────────────────────────────
  selectActive(editions) {
    const today = Time.todayStr();
    const valid = editions.filter(e => e.isAvailable !== false);
    return valid.find(e => today >= (e.dates?.start ?? '') && today <= (e.dates?.end ?? ''))
        ?? valid.find(e => today < (e.dates?.start ?? ''))
        ?? null;
  },

  // ─── Accès aux données ────────────────────────────────────────────
  venue(id) { return this.venues.find(v => v.id === id) ?? null; },

  nextUpcoming(venueId) {
    const now  = new Date();
    const live = this.events.find(e => e.venueId === venueId && Time.status(e) === 'now');
    if (live) return { event: live, status: 'now' };

    const future = this.events
      .filter(e => e.venueId === venueId && new Date(e.startTimestamp) > now)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));

    if (!future.length) return null;
    const next     = future[0];
    const diffMins = Math.round((new Date(next.startTimestamp) - now) / 60_000);
    return diffMins < 1440
      ? { event: next, status: 'soon', minutesUntil: diffMins }
      : { event: next, status: 'later', startsAt: new Date(next.startTimestamp) };
  },

  currentOrNext(venueId) {
    const today = Time.todayStr();
    const now   = new Date();
    const todayList = this.events
      .filter(e => e.venueId === venueId && Time.dateStr(e.startTimestamp) === today)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));

    const live = todayList.find(e => Time.status(e) === 'now');
    if (live) return { event: live, status: 'now' };

    const nextToday = todayList.find(e => new Date(e.startTimestamp) > now);
    if (nextToday) return { event: nextToday, status: 'next' };

    const future = this.events
      .filter(e => e.venueId === venueId && new Date(e.startTimestamp) > now &&
                   Time.dateStr(e.startTimestamp) !== today)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));

    return future.length ? { event: future[0], status: 'next' } : null;
  },

  todaySchedule(venueId) {
    const today = Time.todayStr();
    return this.events
      .filter(e => e.venueId === venueId && Time.dateStr(e.startTimestamp) === today)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));
  },

  daySchedule(venueId, dateStr) {
    return this.events
      .filter(e => e.venueId === venueId && Time.dateStr(e.startTimestamp) === dateStr)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));
  },
};
