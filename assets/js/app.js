/**
 * app.js – Orchestrateur principal Inguru
 *
 * Rôle : coordonner les Web Components et les modules métier.
 * Les composants s'occupent du DOM, app.js s'occupe de la logique.
 *
 * Communication :
 *   Composants → App  : CustomEvents écoutés sur document
 *   App → Composants  : appels de méthodes sur les éléments
 */
const App = {
  lang:                'fr',
  editionsIndex:       [],
  currentMeta: null,
  _townCache:          {},
  _refreshTimer:       null,
  _panelOpen:          false,
  activeVenueId:       null,

  // ─── Références aux composants ───────────────────────────────────
  get $loading()  { return document.querySelector('inguru-loading');        },
  get $header()   { return document.querySelector('inguru-header');         },
  get $panel()    { return document.querySelector('inguru-feria-panel'); },
  get $popup()    { return document.querySelector('inguru-event-popup');    },
  get $fabs()     { return document.querySelector('inguru-fab-stack');      },

  // ─── Init ────────────────────────────────────────────────────────
  async init() {
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});

    this.lang = I18n.detect();
    I18n.set(this.lang);
    this.$header?.setLang(this.lang);

    const timeout = setTimeout(() => {
      const step = document.querySelector('.loading-step')?.textContent ?? 'timeout';
      this.$loading?.showError(`Bloqué à : ${step}`);
    }, 12_000);

    try {
      this.$loading?.setStep(I18n.t('loading'));

      const [index] = await Promise.all([
        Events.loadIndex(),
        Events.loadConfig(),
      ]);

      // Filtre les éditions selon isDisplay dans index.json (true par défaut si absent)
      this.editionsIndex = (index.editions ?? []).filter(e => e.isDisplay !== false);

      await this._enrichEditionsFromGold();

      const active = Events.selectActive(this.editionsIndex);
      await this._loadFeria(active, false);

      this._setupEventListeners();
      this._requestGeolocation();

      clearTimeout(timeout);
      this.$loading?.hide();

    } catch (err) {
      clearTimeout(timeout);
      console.error('[App] init error:', err);
      const step = document.querySelector('.loading-step')?.textContent ?? '';
      this.$loading?.showError(`${step} → ${err.message}`);
    }
  },

  // ─── Écoute des CustomEvents des composants ──────────────────────
  _setupEventListeners() {
    // Header
    document.addEventListener('inguru:feria-panel-toggle', () => {
      this._panelOpen ? this._closePanel() : this._openPanel();
    });

    document.addEventListener('inguru:lang-change', (e) => {
      this._changeLang(e.detail.lang);
    });

    // Festival panel
    document.addEventListener('inguru:feria-select', (e) => {
      this._selectFeria(e.detail.id);
    });

    // Popup
    document.addEventListener('inguru:popup-close', () => {
      this.closePopup();
    });

    // FABs
    document.addEventListener('inguru:locate', () => {
      if (MapModule.userPos) {
        MapModule.centerOnUser();
      } else {
        this.$fabs?.setLocating(true);
        this._requestGeolocation();
        setTimeout(() => {
          if (!MapModule.userPos) this.$fabs?.setLocating(false);
        }, 4000);
      }
    });

    document.addEventListener('inguru:share-location', () => {
      this._shareLocation();
    });

    // Scrim
    document.getElementById('scrim')?.addEventListener('click', () => {
      this._closePanel();
      this.$header?.closeLangMenu();
    });

    // Carte
    document.getElementById('map')?.addEventListener('click', () => {
      // Géré par MapModule, closePopup/closePanel sont appelés depuis map.js
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePopup();
        this._closePanel();
      }
    });
  },

  // ─── Chargement feria ────────────────────────────────────────────
  async _loadFeria(meta, animate = true) {
    Events.venues = [];
    Events.events = [];

    try {
      const loaded = await Events.load(meta);
      Object.assign(meta, loaded);
      const idx = this.editionsIndex.findIndex(f => f.id === meta.id);
      if (idx >= 0) Object.assign(this.editionsIndex[idx], loaded);
    } catch (err) {
      console.error(`[App] Impossible de charger "${meta.id}":`, err.message);
      throw err;
    }

    this.currentMeta = meta;
    this._applyTheme(meta.theme);

    if (!MapModule.map) {
      MapModule.init({ center: meta.center, defaultZoom: meta.defaultZoom ?? 16 });
    } else if (animate) {
      MapModule.map.flyTo(
        [meta.center.lat, meta.center.lng],
        meta.defaultZoom ?? Events.config?.defaultZoom ?? 16,
        { duration: 1.2 }
      );
    }

    MapModule.renderAll(this.lang);

    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      MapModule.renderAll(this.lang);
      if (this.activeVenueId) this._renderAndShowPopup(this.activeVenueId);
    }, (Events.config?.markerRefreshInterval ?? 60) * 1000);

    this.$header?.setFeria(Utils.loc(meta.name, this.lang));
    this.$panel?.render(
      this.editionsIndex, this.lang,
      MapModule.userPos, meta.id,
      (hex) => this._hexToRgb(hex)
    );

    this.closePopup();
  },

  // ─── Thème bi-chromatique ────────────────────────────────────────
  _applyTheme(theme) {
    const p = theme?.primary   ?? '#e63012';
    const s = theme?.secondary ?? '#ffffff';
    const root = document.documentElement;
    root.style.setProperty('--p', p);
    root.style.setProperty('--s', s);
    const { r, g, b } = this._hexToRgb(p);
    root.style.setProperty('--p-a10', `rgba(${r},${g},${b},0.10)`);
    root.style.setProperty('--p-a18', `rgba(${r},${g},${b},0.18)`);
    root.style.setProperty('--p-a35', `rgba(${r},${g},${b},0.35)`);
    root.style.setProperty('--p-a60', `rgba(${r},${g},${b},0.60)`);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', p);
  },

  _hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },

  // ─── Pré-chargement towns ────────────────────────────────────────
  async _enrichEditionsFromGold() {
    await Promise.all(this.editionsIndex.map(async (ed) => {
      if (!ed.id) return;
      const bundlePath = `data/03_gold/${ed.id}.json`;
      try {
        const res = await fetch(bundlePath);
        if (!res.ok) return;
        const d = await res.json();

        if (!ed.dates) ed.dates = d.edition?.dates ?? ed.dates;
        if (!ed.name)  ed.name  = d.feria?.name ?? ed.name;
        if (!ed.theme) ed.theme = d.feria?.theme ?? ed.theme;

        const town = d.town;
        if (town) {
          if (!ed.town)     ed.town     = town.name;
          if (!ed.center)   ed.center   = town.center;
          if (!ed.category) ed.category = town.category;
        }
      } catch (e) {}
    }));
  },

  // ─── Sélection feria ─────────────────────────────────────────────
  async _selectFeria(id) {
    const meta = this.editionsIndex.find(f => f.id === id);
    if (!meta) return;
    this._closePanel();
    await this._loadFeria(meta, true);
  },

  // ─── Panneau feria ───────────────────────────────────────────────
  _openPanel() {
    this._panelOpen = true;
    this.$panel?.open();
    this.$header?.setPanelOpen(true);
    document.getElementById('scrim')?.classList.add('visible');
    this.closePopup();
  },

  _closePanel() {
    this._panelOpen = false;
    this.$panel?.close();
    this.$header?.setPanelOpen(false);
    document.getElementById('scrim')?.classList.remove('visible');
  },

  // ─── Popup événement ─────────────────────────────────────────────
  showPopup(venueId) {
    this.activeVenueId = venueId;
    this._renderAndShowPopup(venueId);
  },

  closePopup() {
    this.activeVenueId = null;
    this.$popup?.hide();
  },

  _renderAndShowPopup(venueId) {
    const html = this._buildPopupHTML(venueId);
    if (!html) return;

    // Applique le thème feria au popup
    const theme = this.currentMeta?.theme;
    this.$popup?.setTheme(theme?.primary ?? '#e63012', theme?.secondary ?? '#fff');
    this.$popup?.show(html);
  },

  _buildPopupHTML(venueId) {
    const lang   = this.lang;
    const venue  = Events.venue(venueId);
    const result = Events.currentOrNext(venueId);
    if (!venue) return null;

    // Distance
    let distHtml = '';
    if (MapModule.userPos) {
      const dist    = Utils.haversine(MapModule.userPos.lat, MapModule.userPos.lng, venue.coords.lat, venue.coords.lng);
      const walkMin = Utils.walkingMinutes(dist);
      const vName   = Utils.escHtml(Utils.loc(venue.name, lang));
      const goUrl   = venue.go ?? null;
      distHtml = `
        <div class="popup-dist">
          <span class="popup-dist-icon">🚶</span>
          <div>
            <div class="popup-dist-main">${Utils.formatDistance(dist)} · ~${walkMin} min</div>
            <div class="popup-dist-sub">${I18n.t('as_crow_flies')}</div>
          </div>
        </div>`;
    }

    const venueGo  = venue.go ?? null;
    const navLabel = Utils.escHtml(Utils.loc(venue.name, lang));
    const goBtn    = `<button class="popup-nav-round" aria-label="${I18n.t('go_there')}"
      onclick="Utils.openDirections(${venue.coords.lat},${venue.coords.lng},'${navLabel}',${venueGo ? `'${venueGo}'` : 'null'})">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
    </button>`;

    const shareBtn = this._buildShareBtn(venue, result, lang);
    const btns     = `<div class="popup-btn-row">${shareBtn}${goBtn}</div>`;

    if (!result) {
      return `
        <div class="popup-body-scroll">
          <div class="popup-venue" style="color:var(--popup-p)">${Utils.escHtml(Utils.loc(venue.name, lang))}</div>
          <div class="popup-title">${I18n.t('no_event')}</div>
          ${distHtml}
        </div>
        <div class="popup-btn-wrap">${btns}</div>`;
    }

    const { event, status } = result;

    const eventDate = Time.dateStr(event.startTimestamp);
    const todayStr  = Time.todayStr();

    const badgeMap = { now: I18n.t('status_now'), next: I18n.t('status_next'), done: I18n.t('status_done') };
    let badgeContent = badgeMap[status];
    if (status === 'next' && eventDate !== todayStr) {
      const d = new Date(event.startTimestamp);
      badgeContent = `📅 ${d.toLocaleDateString(I18n.locale(lang), { weekday:'long', day:'numeric', month:'long' })}`;
    }
    const badge = `<span class="badge badge-${status}"
      style="${status === 'now' ? 'background:var(--popup-p);color:var(--popup-s)' : ''}">
      ${badgeContent}
    </span>`;

    let cdHtml = '';
    if (status === 'next') {
      cdHtml = `<span class="countdown">⏱ ${I18n.t('in')} ${Time.formatCountdown(Time.minutesUntilStart(event))}</span>`;
    } else if (status === 'now') {
      const r = Time.minutesUntilEnd(event);
      if (r > 0) cdHtml = `<span class="countdown-running">⏳ ${I18n.t('remaining')} ${Time.formatCountdown(r)}</span>`;
    }

    const startTime = Time.timeStr(event.startTimestamp);
    const endTime   = event.endTimestamp ? Time.timeStr(event.endTimestamp) : '';
    const timeRange = endTime ? `${startTime}–${endTime}` : startTime;

    const desc    = Utils.loc(event.description, lang);
    const descHtml = desc ? `<p class="popup-desc">${Utils.escHtml(desc)}</p>` : '';

    const sameDaySched   = Events.daySchedule(venueId, eventDate);
    const futureDaysSched = Events.events
      .filter(e => e.venueId === venueId && Time.dateStr(e.startTimestamp) > eventDate)
      .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));
    const allSched = [...sameDaySched, ...futureDaysSched];
    const schedLabel = eventDate === todayStr ? I18n.t('today_schedule') : I18n.t('next_schedule');
    let schedHtml = '';
    if (allSched.length > 1) {
      let lastDay = null;
      const items = allSched.map(e => {
        const eDay   = Time.dateStr(e.startTimestamp);
        let sep = '';
        if (eDay !== eventDate && eDay !== lastDay) {
          lastDay = eDay;
          const dDate = new Date(e.startTimestamp);
          sep = `<div class="schedule-day">${dDate.toLocaleDateString(I18n.locale(lang), { weekday:'long', day:'numeric', month:'long' })}</div>`;
        }
        const st     = Time.status(e);
        const active = e.id === event.id;
        const done   = st === 'done' && !active;
        const ts     = Time.timeStr(e.startTimestamp);
        const te     = e.endTimestamp ? Time.timeStr(e.endTimestamp) : '';
        return `${sep}<div class="schedule-item${active ? ' is-active' : ''}${done ? ' is-done' : ''}">
          <span class="schedule-time">${te ? `${ts}–${te}` : ts}</span>
          <span class="schedule-title">${Utils.escHtml(Utils.loc(e.title, lang))}</span>
        </div>`;
      }).join('');
      schedHtml = `<div class="popup-divider"></div>
        <div class="schedule-label">${schedLabel}</div>
        <div class="schedule-scroll">${items}</div>`;
    }

    return `
      <div class="popup-body-scroll">
        <div class="popup-venue" style="color:var(--popup-p)">${Utils.escHtml(Utils.loc(venue.name, lang))}</div>
        <div class="popup-title">${Utils.escHtml(Utils.loc(event.title, lang))}</div>
        <div class="popup-meta">${badge}<span>🕐 ${timeRange}</span>${cdHtml}</div>
        ${descHtml}
        ${distHtml}
        ${schedHtml}
      </div>
      <div class="popup-btn-wrap">${btns}</div>`;
  },

  // ─── Partage ─────────────────────────────────────────────────────
  _buildShareBtn(venue, result, lang) {
    const venueName = Utils.loc(venue.name, lang);
    const goUrl     = venue.go ?? `https://maps.google.com/?q=${venue.coords.lat},${venue.coords.lng}`;
    const text = result?.event
      ? I18n.t('share_msg_event', { venue: venueName, time: Time.timeStr(result.event.startTimestamp), url: goUrl })
      : I18n.t('share_msg_venue', { venue: venueName, url: goUrl });
    const safe = text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    return `<button class="popup-share-btn" onclick="App._share('${safe}')">
      💬 ${I18n.t('share_pals')}
    </button>`;
  },

  async _share(text) {
    const decoded = text.replace(/\\'/g, "'").replace(/\\"/g, '"');
    if (navigator.share) {
      try { await navigator.share({ text: decoded }); return; } catch(e) { return; }
    }
    try { await navigator.clipboard.writeText(decoded); this._showToast(I18n.t('copied')); }
    catch(e) { this._showToast(decoded); }
  },

  async _shareLocation() {
    const pos = MapModule.userPos;
    if (!pos) { this._showToast(I18n.t('no_position')); return; }
    const url  = `https://maps.google.com/?q=${pos.lat},${pos.lng}`;
    const text = I18n.t('share_loc_msg') + url;
    await this._share(text);
  },

  _showToast(msg) {
    let t = document.getElementById('inguru-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'inguru-toast'; t.className = 'inguru-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
  },

  // ─── Langue ──────────────────────────────────────────────────────
  _changeLang(lang) {
    this.lang = lang;
    I18n.set(lang);
    this.$header?.setLang(lang);
    if (this.currentMeta) {
      this.$header?.setFeria(Utils.loc(this.currentMeta.name, lang));
    }
    this.$panel?.render(
      this.editionsIndex, lang,
      MapModule.userPos, this.currentMeta?.id,
      (hex) => this._hexToRgb(hex)
    );
    MapModule.renderAll(lang);
    if (this.activeVenueId) this._renderAndShowPopup(this.activeVenueId);
  },

  // ─── Géolocalisation ─────────────────────────────────────────────
  _requestGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => this._onGeoSuccess(pos),
      err => {
        if (err.code === 1) this._showToast(I18n.t('geoloc_denied'));
        this._startWatch();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  },

  _startWatch() {
    if (MapModule._geoStarted) return;
    MapModule._geoStarted = true;
    navigator.geolocation.watchPosition(
      pos => this._onGeoSuccess(pos),
      err => console.warn('[Geoloc]', err.message),
      { enableHighAccuracy: true, maximumAge: Events.config?.geolocationMaxAge ?? 10000, timeout: 8000 }
    );
  },

  _onGeoSuccess(pos) {
    const { latitude: lat, longitude: lng } = pos.coords;
    MapModule.updateUserPos(lat, lng);
    this.$fabs?.setActive(true);
    this.$fabs?.setLocating(false);
    this.$fabs?.showShareBtn(true);

    if (!MapModule._firstFix) {
      MapModule._firstFix = true;
      const c = this.currentMeta?.center;
      if (c && Utils.haversine(lat, lng, c.lat, c.lng) < 10000)
        MapModule.map.flyTo([lat, lng], 16, { duration: 1 });
      // Rebuild du panneau avec les distances maintenant connues
      this.$panel?.render(
        this.editionsIndex, this.lang,
        { lat, lng }, this.currentMeta?.id,
        (hex) => this._hexToRgb(hex)
      );
    }
    if (this.activeVenueId) this._renderAndShowPopup(this.activeVenueId);
    this._startWatch();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
