/**
 * time.js – Gestion du temps via ISO 8601 timestamps
 */
const Time = {

  /** Date du jour local → "YYYY-MM-DD" */
  todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  /** Extrait la date locale d'un ISO timestamp → "YYYY-MM-DD" */
  dateStr(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  /** Extrait l'heure locale d'un ISO timestamp → "HH:MM" */
  timeStr(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  /**
   * Statut d'un événement : 'now' | 'next' | 'done'
   * Utilise startTimestamp / endTimestamp (ISO 8601)
   */
  status(event) {
    const now   = new Date();
    const start = new Date(event.startTimestamp);
    // Si endTimestamp absent → durée par défaut 2h
    const end   = event.endTimestamp
      ? new Date(event.endTimestamp)
      : new Date(start.getTime() + 7_200_000);
    if (now >= start && now < end) return 'now';
    if (now < start)               return 'next';
    return 'done';
  },

  /** Minutes jusqu'au début */
  minutesUntilStart(event) {
    return Math.round((new Date(event.startTimestamp) - new Date()) / 60_000);
  },

  /** Minutes jusqu'à la fin (pour un événement en cours) */
  minutesUntilEnd(event) {
    const end = event.endTimestamp
      ? new Date(event.endTimestamp)
      : new Date(new Date(event.startTimestamp).getTime() + 7_200_000);
    return Math.round((end - new Date()) / 60_000);
  },

  /** Minutes → "2h30" ou "45 min" */
  formatCountdown(minutes) {
    if (minutes <= 0) return '';
    if (minutes < 60) return `${minutes}\u202fmin`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }
};
