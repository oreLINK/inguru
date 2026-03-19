/**
 * i18n.js – Traductions inline (aucun fetch réseau)
 */
const I18n = {
  lang: 'fr',

  _strings: {
    fr: {
      loading: 'Chargement…',
      status_now: '▶ En cours',
      status_next: '⏱ Prochainement',
      status_done: '✓ Terminé',
      go_there: 'Y aller',
      share_pals: 'Prévenir mes potes',
      in: 'dans',
      remaining: 'encore',
      today_schedule: "Programme aujourd'hui",
      no_event: 'Aucun événement prévu',
      as_crow_flies: 'à vol d\'oiseau',
      pick_festival: 'Choisir une fête',
      copied: 'Message copié !',
      error_load: 'Impossible de charger les données.',
    },
    es: {
      loading: 'Cargando…',
      status_now: '▶ En curso',
      status_next: '⏱ Próximamente',
      status_done: '✓ Terminado',
      go_there: 'Ir ahí',
      share_pals: 'Avisar a mis amigos',
      in: 'en',
      remaining: 'quedan',
      today_schedule: 'Programa de hoy',
      no_event: 'No hay eventos previstos',
      as_crow_flies: 'en línea recta',
      pick_festival: 'Elegir una fiesta',
      copied: '¡Mensaje copiado!',
      error_load: 'No se pueden cargar los datos.',
    },
    eu: {
      loading: 'Kargatzen…',
      status_now: '▶ Orain',
      status_next: '⏱ Laster',
      status_done: '✓ Amaituta',
      go_there: 'Joan',
      share_pals: 'Lagunei jakinarazi',
      in: 'barru',
      remaining: 'gelditzen',
      today_schedule: 'Gaurko programa',
      no_event: 'Ez dago ekitaldirikan',
      as_crow_flies: 'txori hegaldi',
      pick_festival: 'Festa aukeratu',
      copied: 'Mezua kopiatua!',
      error_load: 'Ezin dira datuak kargatu.',
    },
  },

  t(key) {
    return (this._strings[this.lang] ?? this._strings.fr)[key] ?? key;
  },

  set(lang) {
    if (this._strings[lang]) {
      this.lang = lang;
      localStorage.setItem('inguru-lang', lang);
      document.documentElement.lang = lang;
    }
  },

  detect() {
    const saved = localStorage.getItem('inguru-lang');
    if (saved && this._strings[saved]) return saved;
    const nav = navigator.language?.split('-')[0];
    if (this._strings[nav]) return nav;
    return 'fr';
  },

  // Compat — ne fait plus de fetch
  async load(lang) { this.set(lang ?? this.detect()); },
};
