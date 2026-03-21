/**
 * i18n.js – Traductions inline trilingues (aucun fetch réseau)
 */
const I18n = {
  lang: 'fr',

  _strings: {
    fr: {
      loading:          'Chargement…',
      status_now:       '▶ En cours',
      status_next:      '⏱ Prochainement',
      status_done:      '✓ Terminé',
      go_there:         'Y aller',
      share_pals:       'Prévenir mes potes',
      share_location:   'Partager ma position',
      share_loc_msg:    'Je suis ici → ',
      in:               'dans',
      remaining:        'encore',
      today_schedule:   "Programme aujourd'hui",
      next_schedule:    'Prochain programme',
      no_event:         'Aucun événement prévu',
      as_crow_flies:    'à vol d\'oiseau',
      pick_festival:    'Choisir une fête',
      copied:           'Message copié !',
      error_load:       'Impossible de charger les données.',
      section_large:    'Les grandes',
      section_medium:   'Les intermédiaires',
      section_small:    'Les petites',
      status_active:    '● En cours',
      status_upcoming:  'À venir',
      status_past:      'Terminé',
      locate_enable:    'Activer la localisation',
      geoloc_denied:    'Autorisez la localisation dans les réglages',
      search_festival:  'Rechercher une fête…',
      no_position:      'Position inconnue',
      walk_min:         '~{n} min à pied',
    },
    es: {
      loading:          'Cargando…',
      status_now:       '▶ En curso',
      status_next:      '⏱ Próximamente',
      status_done:      '✓ Terminado',
      go_there:         'Ir ahí',
      share_pals:       'Avisar a mis amigos',
      share_location:   'Compartir mi posición',
      share_loc_msg:    'Estoy aquí → ',
      in:               'en',
      remaining:        'quedan',
      today_schedule:   'Programa de hoy',
      next_schedule:    'Próximo programa',
      no_event:         'No hay eventos previstos',
      as_crow_flies:    'en línea recta',
      pick_festival:    'Elegir una fiesta',
      copied:           '¡Mensaje copiado!',
      error_load:       'No se pueden cargar los datos.',
      section_large:    'Las grandes',
      section_medium:   'Las intermedias',
      section_small:    'Las pequeñas',
      status_active:    '● En curso',
      status_upcoming:  'Próximamente',
      status_past:      'Terminado',
      locate_enable:    'Activar localización',
      geoloc_denied:    'Autoriza la localización en ajustes',
      search_festival:  'Buscar una fiesta…',
      no_position:      'Posición desconocida',
      walk_min:         '~{n} min a pie',
    },
    eu: {
      loading:          'Kargatzen…',
      status_now:       '▶ Orain',
      status_next:      '⏱ Laster',
      status_done:      '✓ Amaituta',
      go_there:         'Joan',
      share_pals:       'Lagunei jakinarazi',
      share_location:   'Nire kokapena partekatu',
      share_loc_msg:    'Hemen nago → ',
      in:               'barru',
      remaining:        'gelditzen',
      today_schedule:   'Gaurko programa',
      next_schedule:    'Hurrengo programa',
      no_event:         'Ez dago ekitaldirikan',
      as_crow_flies:    'txori hegaldi',
      pick_festival:    'Festa aukeratu',
      copied:           'Mezua kopiatua!',
      error_load:       'Ezin dira datuak kargatu.',
      section_large:    'Handiak',
      section_medium:   'Ertainak',
      section_small:    'Txikiak',
      status_active:    '● Martxan',
      status_upcoming:  'Laster',
      status_past:      'Amaituta',
      locate_enable:    'Kokapena gaitu',
      geoloc_denied:    'Baimendu kokapena ezarpenetan',
      search_festival:  'Festa bilatu…',
      no_position:      'Kokapena ezezaguna',
      walk_min:         '~{n} min oinez',
    },
  },

  t(key, vars = {}) {
    let str = (this._strings[this.lang] ?? this._strings.fr)[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
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

  async load(lang) { this.set(lang ?? this.detect()); },
};
