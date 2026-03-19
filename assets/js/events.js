/**
 * events.js – Chargement et filtrage des événements (structure ISO timestamps)
 */
const Events = {
  festival: null,
  venues:   [],
  events:   [],

  async loadIndex() {
    const res = await fetch('data/index.json');
    if (!res.ok) throw new Error('Impossible de charger data/index.json');
    return res.json();
  },

  async load(festivalId) {
    const base = `data/festivals/${festivalId}`;
    const [fRes, vRes, eRes] = await Promise.all([
      fetch(`${base}/festival.json`),
      fetch(`${base}/venues.json`),
      fetch(`${base}/events.json`)
    ]);
    if (!fRes.ok || !vRes.ok || !eRes.ok)
      throw new Error(`Données manquantes pour "${festivalId}"`);
    this.festival = await fRes.json();
    this.venues   = await vRes.json();
    this.events   = await eRes.json();
    return { festival: this.festival, venues: this.venues, events: this.events };
  },

  selectActive(index) {
    const today = Time.todayStr();
    return index.find(f => today >= f.dates.start && today <= f.dates.end) ?? index[0];
  },

  venue(id) { return this.venues.find(v => v.id === id) ?? null; },

  /**
   * Prochain événement à venir pour un lieu (maintenant OU futur).
   * Les événements passés (status 'done') ne sont JAMAIS retournés.
   * → utilisé par les marqueurs carte.
   */
  nextUpcoming(venueId) {
    const now = new Date();

    // 1. En cours ?
    const live = this.events.find(e =>
      e.venueId === venueId && Time.status(e) === 'now'
    );
    if (live) return { event: live, status: 'now' };

    // 2. Prochain futur strictement
    const future = this.events
      .filter(e => e.venueId === venueId && new Date(e.startTimestamp) > now)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));

    if (future.length === 0) return null;  // aucun événement futur → marqueur masqué

    const next     = future[0];
    const diffMins = Math.round((new Date(next.startTimestamp) - now) / 60_000);

    if (diffMins < 24 * 60)
      return { event: next, status: 'soon', minutesUntil: diffMins };
    return { event: next, status: 'later', startsAt: new Date(next.startTimestamp) };
  },

  /**
   * Événement en cours ou prochain aujourd'hui (pour le popup).
   * N'affiche PAS les événements passés.
   */
  currentOrNext(venueId) {
    const today = Time.todayStr();
    const now   = new Date();
    const list  = this.events
      .filter(e => e.venueId === venueId && Time.dateStr(e.startTimestamp) === today)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));

    if (list.length === 0) return null;

    const live = list.find(e => Time.status(e) === 'now');
    if (live) return { event: live, status: 'now' };

    // Prochain futur aujourd'hui
    const next = list.find(e => new Date(e.startTimestamp) > now);
    if (next) return { event: next, status: 'next' };

    // Tout est passé → null (ne pas afficher les passés)
    return null;
  },

  /** Programme du jour complet (y compris passés, pour l'affichage de la liste). */
  todaySchedule(venueId) {
    const today = Time.todayStr();
    return this.events
      .filter(e => e.venueId === venueId && Time.dateStr(e.startTimestamp) === today)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));
  }
};
