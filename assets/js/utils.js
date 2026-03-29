/**
 * utils.js – Fonctions utilitaires génériques
 */
const Utils = {

  /**
   * Distance à vol d'oiseau (formule de Haversine) → mètres
   */
  haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  /**
   * Formate une distance en mètres → "120 m" ou "1.4 km"
   */
  formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  },

  /**
   * Temps de marche estimé (vitesse moyenne 4,5 km/h ≈ 75 m/min)
   */
  walkingMinutes(meters) {
    return Math.max(1, Math.ceil(meters / 75));
  },

  /**
   * Ouvre l'itinéraire piéton.
   * Si goUrl (event.go) est fourni → ouvre ce lien directement.
   * Sinon → construit un lien Google Maps / Apple Maps depuis les coords.
   */
  openDirections(lat, lng, venueName, goUrl = null) {
    if (goUrl) {
      window.open(goUrl, '_blank');
      return;
    }
    const label = encodeURIComponent(venueName || '');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`);
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
        '_blank'
      );
    }
  },

  /**
   * Récupère la valeur localisée d'un champ (string ou { fr, es, eu })
   */
  loc(field, lang) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] ?? field['fr'] ?? field['es'] ?? Object.values(field)[0] ?? '';
  },

  /**
   * Tronque un texte à `max` caractères en coupant sur un espace (+ ellipsis)
   */
  shortText(str, max = 20) {
    if (!str || str.length <= max) return str;
    const cut = str.slice(0, max).lastIndexOf(' ');
    return (cut > max / 2 ? str.slice(0, cut) : str.slice(0, max)).trimEnd() + '…';
  },

  /**
   * Échappe le HTML pour éviter les injections
   */
  escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
