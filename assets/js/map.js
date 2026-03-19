/**
 * map.js – Carte Leaflet (OpenStreetMap, 100% gratuit)
 */
const MapModule = {
  map: null,
  markers: {},
  userMarker: null,
  userPos: null,
  _firstFix: false,
  _geoStarted: false,
  _sheetJustOpened: false,

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      detectRetina: true,
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.map.on('click', () => {
      if (this._sheetJustOpened) { this._sheetJustOpened = false; return; }
      App.closePopup();
      App._closeFestivalPanel();
    });
  },

  // ─── Icône ────────────────────────────────────────────────────────

  _makeIcon(line1, line2, status) {
    const liveDot = status === 'now' ? `<span class="marker-live-dot"></span>` : '';
    const cls = `m-${status}`;
    const html = `
      <div class="inguru-marker ${cls}">
        <div class="marker-bubble">
          <div class="mb-line1">${liveDot}${Utils.escHtml(line1)}</div>
          <div class="mb-line2">${Utils.escHtml(line2)}</div>
        </div>
        <div class="marker-tail"></div>
      </div>`;

    // Largeur basée sur la ligne la plus longue
    const longest = Math.max(line1.length, line2.length);
    const w = Math.min(200, Math.max(110, longest * 7 + 24));
    return L.divIcon({
      html,
      className:   '',
      iconSize:    [w, 52],
      iconAnchor:  [w / 2, 52],
      popupAnchor: [0, -54],
    });
  },

  // ─── Formatage du temps sur le marqueur ──────────────────────────

  /**
   * Retourne la string de temps à afficher sur la bulle.
   * - En cours   : "" (on affiche juste le live dot)
   * - < 1h       : "dans 42min"  (sera mis à jour chaque minute)
   * - Aujourd'hui ≥ 1h : "dans 2h30"
   * - Demain / < 7j   : "lun. à 20h30"
   * - Sinon           : "25/07 à 20h30"
   */
  _formatMarkerTime(result) {
    if (!result) return '';
    const { status, minutesUntil, startsAt, event } = result;

    if (status === 'now') return '';

    const now    = new Date();
    const start  = new Date(event.startTimestamp);
    const diffMs = start - now;
    const mins   = Math.round(diffMs / 60_000);

    if (mins < 60) {
      return `dans ${mins}min`;
    }

    // Même jour civil ?
    const sameDay = start.toDateString() === now.toDateString();
    if (sameDay) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `dans ${h}h${m > 0 ? String(m).padStart(2,'0') : ''}`;
    }

    // < 7 jours
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays < 7) {
      const wd  = start.toLocaleDateString('fr-FR', { weekday: 'short' });
      const hh  = String(start.getHours()).padStart(2,'0');
      const mm  = String(start.getMinutes()).padStart(2,'0');
      return `${wd} à ${hh}h${mm}`;
    }

    // Au-delà de 7 jours
    const dd  = String(start.getDate()).padStart(2,'0');
    const mo  = String(start.getMonth()+1).padStart(2,'0');
    const hh  = String(start.getHours()).padStart(2,'0');
    const mm  = String(start.getMinutes()).padStart(2,'0');
    return `${dd}/${mo} à ${hh}h${mm}`;
  },

  // ─── Rendu de tous les marqueurs ─────────────────────────────────

  renderAll(lang) {
    const toRemove = new Set(Object.keys(this.markers));

    for (const venue of Events.venues) {
      const result = Events.nextUpcoming(venue.id);

      // Pas d'événement futur → masquer
      if (!result) {
        if (this.markers[venue.id]) {
          this.map.removeLayer(this.markers[venue.id]);
          delete this.markers[venue.id];
        }
        continue;
      }

      toRemove.delete(venue.id);

      const { event, status } = result;
      // Ligne 1 : shortName de l'event (max 18 chars, garanti par les données)
      const line1 = event.shortName ?? (Utils.loc(event.title, lang).slice(0, 18));
      // Ligne 2 : timing
      const line2 = this._formatMarkerTime(result);

      const icon = this._makeIcon(line1, line2, status);
      const { lat, lng } = venue.coords;

      if (this.markers[venue.id]) {
        this.markers[venue.id].setIcon(icon);
        this.markers[venue.id]._venueId = venue.id;
      } else {
        const marker = L.marker([lat, lng], { icon }).addTo(this.map);
        marker._venueId = venue.id;

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this._openVenue(venue.id, marker.getLatLng());
        });
        marker.on('touchend', (e) => {
          L.DomEvent.stopPropagation(e);
          this._openVenue(venue.id, marker.getLatLng());
        });

        this.markers[venue.id] = marker;
      }
    }

    // Nettoyage marqueurs orphelins
    for (const id of toRemove) {
      if (this.markers[id]) {
        this.map.removeLayer(this.markers[id]);
        delete this.markers[id];
      }
    }
  },

  _openVenue(venueId, latlng) {
    this._sheetJustOpened = true;
    App.showPopup(venueId, latlng);
    setTimeout(() => { this._sheetJustOpened = false; }, 400);
  },

  // ─── Position utilisateur ─────────────────────────────────────────

  updateUserPos(lat, lng) {
    this.userPos = { lat, lng };
    if (this.userMarker) { this.userMarker.setLatLng([lat, lng]); return; }
    const icon = L.divIcon({
      html: '<div class="user-dot"></div>',
      className: '', iconSize: [16,16], iconAnchor: [8,8],
    });
    this.userMarker = L.marker([lat, lng], { icon, zIndexOffset: 500 }).addTo(this.map);
  },

  centerOnUser() {
    if (this.userPos) this.map.flyTo([this.userPos.lat, this.userPos.lng], 17, { duration: 0.8 });
  },
};
