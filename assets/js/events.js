/**
 * events.js – Chargement et filtrage
 *
 * Structure de données :
 *   config/config.json            → config technique (zoom, intervalles…)
 *   config/features.json          → feature flags + serviceTypes
 *   data/editions.json            → index des éditions { id, cityId, feteId, isDisplay }
 *   data/cities.json              → villes (BAY, PAM, MDM, DAX, CON)
 *   data/places/{cityId}.json     → places par ville
 *   data/fetes/{feteId}.json      → fête (nom, thème, services, anims)
 *   data/editions/{editionId}.json → infos édition (dates, année)
 *   data/events/{editionId}.json  → events de l'édition
 */
const Events = {
  town:         null,
  feria:        null,
  edition:      null,
  venues:       [],
  events:       [],
  services:     [],
  serviceTypes: [],
  anims:        [],

  config:       null,
  categories:   {},

  // ─── Chargement de la config globale ─────────────────────────────
  async loadConfig() {
    const [configRes, featuresRes] = await Promise.all([
      fetch('config/config.json'),
      fetch('config/features.json'),
    ]);
    if (!configRes.ok)   throw new Error('Impossible de charger config/config.json');
    if (!featuresRes.ok) throw new Error('Impossible de charger config/features.json');

    this.config       = await configRes.json();
    const features    = await featuresRes.json();
    this.serviceTypes = features.serviceTypes ?? [];
    Features.load(features);

    return this.config;
  },

  // ─── Chargement de l'index des éditions ──────────────────────────
  async loadIndex() {
    const res = await fetch('data/editions.json');
    if (!res.ok) throw new Error('Impossible de charger data/editions.json');
    return res.json();
  },

  /**
   * Charge toutes les données d'une édition depuis les fichiers plats.
   * Retourne un objet `meta` complet pour l'affichage (fusion town + feria + edition).
   *
   * @param {object} ref  Entrée de l'index : { id, cityId, feteId, editionId, isDisplay }
   */
  async load(ref) {
    if (!ref.cityId || !ref.feteId || !ref.id)
      throw new Error(`Ref invalide : cityId, feteId, id requis`);

    const [citiesRes, placesRes, feteRes, editionRes, eventsRes] = await Promise.all([
      fetch('data/cities.json'),
      fetch(`data/places/${ref.cityId}.json`),
      fetch(`data/fetes/${ref.feteId}.json`),
      fetch(`data/editions/${ref.id}.json`),
      fetch(`data/events/${ref.id}.json`),
    ]);

    if (!placesRes.ok)  throw new Error(`Fichier manquant : data/places/${ref.cityId}.json`);
    if (!feteRes.ok)    throw new Error(`Fichier manquant : data/fetes/${ref.feteId}.json`);
    if (!editionRes.ok) throw new Error(`Fichier manquant : data/editions/${ref.id}.json`);
    if (!eventsRes.ok)  throw new Error(`Fichier manquant : data/events/${ref.id}.json`);

    const cities    = citiesRes.ok ? await citiesRes.json() : { cities: [] };
    const placesDoc = await placesRes.json();
    const fete      = await feteRes.json();
    const edition   = await editionRes.json();
    const eventsDoc = await eventsRes.json();

    this.town    = (cities.cities ?? []).find(c => c.id === ref.cityId) ?? null;
    this.feria   = fete;
    this.edition = edition;

    // Seules les places référencées par les events de cette édition
    const usedPlaceIds = new Set((eventsDoc.events ?? []).map(e => e.venueId).filter(Boolean));
    this.venues   = (placesDoc.places ?? []).filter(p => usedPlaceIds.has(p.id));

    this.events = (eventsDoc.events ?? []).map(e => ({
      ...e,
      id: e.id ?? Events._hashEvent(e),
    }));
    this.services = fete.services    ?? [];
    this.anims    = fete.anims       ?? [];

    if (!this.town || !this.feria || !this.edition)
      throw new Error(`Données invalides pour ${ref.editionId}`);

    return this._buildMeta(ref);
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
      theme:       this.feria.theme,
      // Données de l'édition
      dates:       this.edition.dates,
      defaultZoom: this.config?.defaultZoom ?? 17,
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

  _hashEvent(e) {
    const str = `${e.title?.fr ?? ''}|${e.venueId ?? ''}|${e.startTimestamp ?? ''}|${e.endTimestamp ?? ''}`;
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  },
};
