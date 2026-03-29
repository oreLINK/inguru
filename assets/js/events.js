/**
 * events.js – Chargement et filtrage
 *
 * Structure de données :
 *   data/index.json                                          → liste des éditions
 *   data/gold/{cityId}__{festivalId}__{year}.json            → bundle "édition" (ville + fête + dates + lieux + events)
 */
const Events = {
  city:     null,
  festival: null,
  edition:  null,
  venues:   [],
  events:   [],

  config: null,

  // ─── Chargement de la config globale ─────────────────────────────
  async loadConfig() {
    const res = await fetch('data/config.json');
    if (!res.ok) throw new Error('Impossible de charger data/config.json');
    this.config = await res.json();
    return this.config;
  },

  // ─── Chargement de l'index ────────────────────────────────────────
  async loadIndex() {
    const res = await fetch('data/index.json');
    if (!res.ok) throw new Error('Impossible de charger data/index.json');
    return res.json();
  },

  /**
   * Charge toutes les données d'une édition depuis la nouvelle structure.
   * Retourne un objet `meta` complet pour l'affichage (fusion city + festival + edition).
   *
   * @param {object} ref  Entrée de l'index : { id, cityId, festivalId, year }
   */
  async load(ref) {
    const { cityId, festivalId, year } = ref;
    const bundlePath = `data/gold/${cityId}__${festivalId}__${year}.json`;
    const res = await fetch(bundlePath);
    if (!res.ok) throw new Error(`Fichier manquant : ${bundlePath}`);

    const bundle = await res.json();
    this.city     = bundle.city ?? null;
    this.festival = bundle.festival ?? null;
    this.edition  = bundle.edition ?? null;
    this.venues   = bundle.places ?? [];
    this.events   = bundle.events ?? [];

    if (!this.city || !this.festival || !this.edition)
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
      cityId:      ref.cityId,
      festivalId:  ref.festivalId,
      year:        ref.year,
      // Nom : du festival, affiché avec la ville
      name:        this.festival.name,
      city:        this.city.name,
      // emoji supprimé
      // Données géographiques depuis la ville
      center:      this.city.center,
      category:    this.city.category,
      // Thème depuis le festival (couleurs propres à chaque fête)
      theme:       this.festival.theme,
      // Données de l'édition
      dates:       this.edition.dates,
      defaultZoom: this.edition.defaultZoom ?? this.config?.defaultZoom ?? 16,
      website:     this.festival.website ?? null,
    };
  },

  /**
   * Construit les metas de toutes les éditions de l'index SANS charger
   * les fichiers individuels (pour le panneau festival picker).
   * Utilisé par app.js._buildFestivalPanel() via les données déjà en cache dans l'index.
   */
  metaFromIndexEntry(entry, cachedCities) {
    const city = cachedCities[entry.cityId];
    return city ? {
      ...entry,
      city:     city.name,
      center:   city.center,
      theme:    city.theme,
      category: city.category,
    } : entry;
  },

  // ─── Sélection du festival actif ──────────────────────────────────
  selectActive(editions) {
    const today = Time.todayStr();
    return editions.find(e => today >= e.dates?.start && today <= e.dates?.end)
        ?? editions[0];
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
