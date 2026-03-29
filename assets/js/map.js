/**
 * map.js – Carte Leaflet avec dark mode crépusculaire
 */
const MapModule = {
  map: null,
  markers: {},
  userMarker: null,
  userPos: null,
  _firstFix: false,
  _geoStarted: false,
  _sheetJustOpened: false,
  _isDark: false,

  init(festival) {
    const { lat, lng } = festival.center;

    this.map = L.map('map', {
      zoomControl:         false,
      attributionControl:  true,
      zoomSnap:            0.25,
      zoomDelta:           0.5,
      wheelPxPerZoomLevel: 80,
      tap:                 false,
    }).setView([lat, lng], festival.defaultZoom ?? 16);

    // Tuile unique OpenStreetMap — dark mode via filtre CSS
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>',
      maxZoom: 19, detectRetina: true,
    }).addTo(this.map);

    // Applique le filtre CSS jour/nuit
    this._applyDayNight(lat, lng);

    // Zoom à gauche
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    this.map.on('click', () => {
      if (this._sheetJustOpened) { this._sheetJustOpened = false; return; }
      App.closePopup();
      App._closePanel();
    });

    // Vérifie le mode jour/nuit toutes les 5 minutes
    setInterval(() => this._applyDayNight(lat, lng), 5 * 60_000);
  },

  // ─── Calcul crépusculaire (sans API) ─────────────────────────────
  _sunTimes(lat, lng) {
    const now     = new Date();
    const J2000   = 2451545.0;
    const jd      = (now.getTime() / 86_400_000) + 2440587.5;
    const n       = jd - J2000;
    const L       = (280.46 + 0.9856474 * n) % 360;
    const g       = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
    const lambda  = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
    const sinDec  = Math.sin(23.439 * Math.PI / 180) * Math.sin(lambda);
    const dec     = Math.asin(sinDec);
    const latRad  = lat * Math.PI / 180;
    const cosH    = (Math.cos(90.833 * Math.PI / 180) - Math.sin(latRad) * sinDec)
                    / (Math.cos(latRad) * Math.cos(dec));
    if (Math.abs(cosH) > 1) return null; // soleil jamais couché/levé
    const H       = Math.acos(cosH) * 180 / Math.PI;
    const GMST    = 6.697375 + 0.0657098242 * n;
    const RA      = Math.atan2(Math.cos(dec) * Math.sin(lambda), Math.cos(lambda)) * 180 / Math.PI / 15;
    const transit = (RA - GMST - lng / 15 + 24) % 24;
    const rise    = ((transit - H / 15) + 24) % 24;
    const set     = ((transit + H / 15) + 24) % 24;
    return { rise, set }; // heures UTC décimales
  },

  _applyDayNight(lat, lng) {
    const times  = this._sunTimes(lat, lng);
    const nowUTC = new Date();
    const utcH   = nowUTC.getUTCHours() + nowUTC.getUTCMinutes() / 60;
    let isDark   = false;

    if (times) {
      isDark = utcH < times.rise || utcH >= times.set;
    }

    if (isDark === this._isDark) return;
    this._isDark = isDark;

    // Technique CSS filter — aucune tuile supplémentaire, même source OSM
    // Réf: https://dev.to/deepakdevanand/leaflet-map-dark-theme-5ej0
    const tiles = document.querySelectorAll('.leaflet-tile-pane');
    tiles.forEach(el => {
      el.style.filter = isDark
        ? 'invert(100%) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.8)'
        : '';
    });

    document.body.classList.toggle('map-dark', isDark);
  },

  // ─── Icône 2 lignes ───────────────────────────────────────────────
  _makeIcon(line1, line2, status) {
    const liveDot = status === 'now' ? `<span class="marker-live-dot"></span>` : '';
    const html = `
      <div class="inguru-marker m-${status}">
        <div class="marker-bubble">
          <div class="mb-line1">${liveDot}${Utils.escHtml(line1)}</div>
          ${line2 ? `<div class="mb-line2">${Utils.escHtml(line2)}</div>` : ''}
        </div>
        <div class="marker-tail"></div>
      </div>`;
    const longest = Math.max(line1.length, (line2 || '').length);
    const w = Math.min(195, Math.max(110, longest * 7 + 24));
    return L.divIcon({ html, className: '', iconSize: [w, line2 ? 52 : 38], iconAnchor: [w/2, line2 ? 52 : 38], popupAnchor: [0, -54] });
  },

  _formatMarkerTime(result, lang) {
    if (!result || result.status === 'now') return '';
    const now   = new Date();
    const start = new Date(result.event.startTimestamp);
    const mins  = Math.round((start - now) / 60_000);
    if (mins < 60) return I18n.t('in_x_min', { n: mins });
    const sameDay = start.toDateString() === now.toDateString();
    if (sameDay) {
      const h = Math.floor(mins / 60), m = mins % 60;
      const t = `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
      return I18n.t('in_x_hours', { t });
    }
    const diffDays = Math.floor((start - now) / 86_400_000);
    const hh = String(start.getHours()).padStart(2, '0');
    const mm = String(start.getMinutes()).padStart(2, '0');
    const t  = `${hh}h${mm}`;
    if (diffDays < 7) {
      const wd = start.toLocaleDateString(I18n.locale(lang), { weekday: 'short' });
      return I18n.t('wd_at', { wd, t });
    }
    const dd = String(start.getDate()).padStart(2, '0');
    const mo = String(start.getMonth() + 1).padStart(2, '0');
    return I18n.t('date_at', { d: `${dd}/${mo}`, t });
  },

  renderAll(lang) {
    const toRemove = new Set(Object.keys(this.markers));

    for (const venue of Events.venues) {
      const result = Events.nextUpcoming(venue.id);
      if (!result) {
        if (this.markers[venue.id]) { this.map.removeLayer(this.markers[venue.id]); delete this.markers[venue.id]; }
        continue;
      }
      toRemove.delete(venue.id);

      const { event, status } = result;
      const line1 = event.shortName ?? Utils.shortText(Utils.loc(event.title, lang), 20);
      const line2 = this._formatMarkerTime(result, lang);
      const icon  = this._makeIcon(line1, line2, status);
      const { lat, lng } = venue.coords;

      if (this.markers[venue.id]) {
        this.markers[venue.id].setIcon(icon);
      } else {
        const marker = L.marker([lat, lng], { icon }).addTo(this.map);
        marker._venueId = venue.id;
        marker.on('click',    (e) => { L.DomEvent.stopPropagation(e); this._openVenue(venue.id); });
        marker.on('touchend', (e) => { L.DomEvent.stopPropagation(e); this._openVenue(venue.id); });
        this.markers[venue.id] = marker;
      }
    }

    for (const id of toRemove) { if (this.markers[id]) { this.map.removeLayer(this.markers[id]); delete this.markers[id]; } }
  },

  _openVenue(venueId) {
    this._sheetJustOpened = true;
    App.showPopup(venueId);
    setTimeout(() => { this._sheetJustOpened = false; }, 400);
  },

  updateUserPos(lat, lng) {
    this.userPos = { lat, lng };
    if (this.userMarker) { this.userMarker.setLatLng([lat, lng]); return; }
    const icon = L.divIcon({ html: '<div class="user-dot"></div>', className: '', iconSize: [16,16], iconAnchor: [8,8] });
    this.userMarker = L.marker([lat, lng], { icon, zIndexOffset: 500 }).addTo(this.map);
  },

  centerOnUser() {
    if (this.userPos) this.map.flyTo([this.userPos.lat, this.userPos.lng], 17, { duration: 0.8 });
  },
};
