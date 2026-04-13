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
// ─── Icônes des services de streaming ───────────────────────────────────────
const _STREAM_SERVICES = [
  {
    key:      'spotify',
    label:    'Spotify',
    color:    '#1DB954',
    buildUrl: (n) => `https://open.spotify.com/search/${encodeURIComponent(n)}`,
    svg:      `<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3c-.2.4-.7.5-1 .2-2.8-1.7-6.4-2.1-10.6-1.1-.4.1-.8-.2-.9-.5-.1-.4.2-.8.5-.9 4.6-1 8.5-.6 11.6 1.3.4.2.6.7.4 1zm1.4-3.3c-.3.4-.8.6-1.3.3-3.2-2-8.2-2.6-12-1.4-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4-1.2 8.9-.6 12.5 1.6.4.2.6.8.3 1.2zm.2-3.4C15.2 8.4 8.8 8.2 5.2 9.3c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.3-1.3 11.3-1 15.7 1.6.5.3.7 1 .4 1.6-.3.4-1 .6-1.5.2z"/></svg>`,
  },
  {
    key:      'appleMusic',
    label:    'Apple Music',
    color:    '#FC3C44',
    buildUrl: (n) => `https://music.apple.com/search?term=${encodeURIComponent(n)}`,
    svg:      `<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 3v10.6c-.6-.4-1.3-.6-2-.6-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4V7h4V3h-6z"/></svg>`,
  },
  {
    key:      'youtube',
    label:    'YouTube',
    color:    '#FF0000',
    buildUrl: (n) => `https://www.youtube.com/results?search_query=${encodeURIComponent(n)}`,
    svg:      `<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4L15.9 12z"/></svg>`,
  },
  {
    key:      'soundcloud',
    label:    'SoundCloud',
    color:    '#FF5500',
    buildUrl: (n) => `https://soundcloud.com/search?q=${encodeURIComponent(n)}`,
    svg:      `<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><rect x="0"   y="12" width="2.5" height="6" rx="1.25"/><rect x="3.5" y="9"  width="2.5" height="9" rx="1.25"/><rect x="7"   y="6"  width="2.5" height="12" rx="1.25"/><path d="M11 7.5v10.5h9.5a3.5 3.5 0 0 0 0-7c-.12 0-.24.01-.36.02A5.5 5.5 0 0 0 11 7.5z"/></svg>`,
  },
];

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
      if (!active) {
        clearTimeout(timeout);
        this.$loading?.hide();
        this._showNoEvents();
        return;
      }
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
    Events.venues   = [];
    Events.events   = [];
    Events.services = [];
    Events.anims    = [];
    if (MapModule.map) { MapModule.clearServices(); MapModule.clearAnims(); }

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

    const eid = meta.id;
    if (Features.get('events', eid)) {
      MapModule.renderAll(this.lang);
    } else {
      for (const id of Object.keys(MapModule.markers)) { MapModule.map.removeLayer(MapModule.markers[id]); }
      MapModule.markers = {};
    }

    if (Features.get('services', eid)) {
      MapModule.renderServices();
    } else {
      MapModule.clearServices();
    }

    MapModule.renderAnims();
    MapModule.setZoomVisible(Features.get('zoomButton', eid));
    this.$fabs?.showLocateBtn(Features.get('locationButton', eid));

    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      if (Features.get('events', this.currentMeta?.id)) MapModule.renderAll(this.lang);
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

  // ─── Écran vide ──────────────────────────────────────────────────
  _showNoEvents() {
    document.getElementById('no-events')?.classList.add('visible');
    const msg = document.getElementById('no-events-msg');
    if (msg) msg.textContent = I18n.t('no_events_available');
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
      const bundlePath = `data/gold/${ed.id}.json`;
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
    if (!Features.get('eventPopup.enabled', this.currentMeta?.id)) return;
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
    const eid    = this.currentMeta?.id;
    const venue  = Events.venue(venueId);
    const result = Events.currentOrNext(venueId);
    if (!venue) return null;

    const f = (key) => Features.get(`eventPopup.fields.${key}`, eid);

    // Distance (délai de marche)
    let distHtml = '';
    if (MapModule.userPos && f('delay')) {
      const dist    = Utils.haversine(MapModule.userPos.lat, MapModule.userPos.lng, venue.coords.lat, venue.coords.lng);
      const walkMin = Utils.walkingMinutes(dist);
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
    const goBtn    = f('directionsButton') ? `<button class="popup-nav-round" aria-label="${I18n.t('go_there')}"
      onclick="Utils.openDirections(${venue.coords.lat},${venue.coords.lng},'${navLabel}',${venueGo ? `'${venueGo}'` : 'null'})">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
    </button>` : '';

    const shareBtn = f('notifyFriendsButton') ? this._buildShareBtn(venue, result, lang) : '';
    const btns     = (shareBtn || goBtn) ? `<div class="popup-btn-row">${shareBtn}${goBtn}</div>` : '';

    if (!result) {
      return `
        <div class="popup-body-scroll">
          ${f('place') ? `<div class="popup-venue" style="color:var(--popup-p)">${Utils.escHtml(Utils.loc(venue.name, lang))}</div>` : ''}
          ${f('title') ? `<div class="popup-title">${I18n.t('no_event')}</div>` : ''}
          ${distHtml}
        </div>
        ${btns ? `<div class="popup-btn-wrap">${btns}</div>` : ''}`;
    }

    const { event, status } = result;

    const eventDate = Time.dateStr(event.startTimestamp);
    const todayStr  = Time.todayStr();

    const badgeMap = { now: I18n.t('status_now'), next: I18n.t('status_next'), done: I18n.t('status_done') };
    let badgeContent = badgeMap[status];
    if (f('date') && status === 'next' && eventDate !== todayStr) {
      const d = new Date(event.startTimestamp);
      badgeContent = `📅 ${d.toLocaleDateString(I18n.locale(lang), { weekday:'long', day:'numeric', month:'long' })}`;
    }
    const badge = `<span class="badge badge-${status}"
      style="${status === 'now' ? 'background:var(--popup-p);color:var(--popup-s)' : ''}">
      ${badgeContent}
    </span>`;

    let cdHtml = '';
    if (f('delay')) {
      if (status === 'next') {
        cdHtml = `<span class="countdown">⏱ ${I18n.t('in')} ${Time.formatCountdown(Time.minutesUntilStart(event))}</span>`;
      } else if (status === 'now') {
        const r = Time.minutesUntilEnd(event);
        if (r > 0) cdHtml = `<span class="countdown-running">⏳ ${I18n.t('remaining')} ${Time.formatCountdown(r)}</span>`;
      }
    }

    const startTime = Time.timeStr(event.startTimestamp);
    const endTime   = event.endTimestamp ? Time.timeStr(event.endTimestamp) : '';
    const timeRange = endTime ? `${startTime}–${endTime}` : startTime;
    const timeHtml  = f('time') ? `<span>🕐 ${timeRange}</span>` : '';

    const desc    = Utils.loc(event.description, lang);
    const descHtml = (desc && f('description')) ? `<p class="popup-desc">${Utils.escHtml(desc)}</p>` : '';

    const payment = event.payment ?? null;
    let paymentHtml = '';
    if (payment && (payment.isPaid || payment.isTicketMandatory)) {
      const pills = [];
      if (payment.isPaid && f('payment'))
        pills.push(`<span class="ppill ppill-paid">${I18n.t('paid')}</span>`);
      if (payment.isTicketMandatory && f('ticketRequired'))
        pills.push(`<span class="ppill ppill-ticket">${I18n.t('ticket_required')}</span>`);
      if (f('ticketing')) {
        if (payment.isTicketOnline && payment.linkTicket)
          pills.push(`<a href="${Utils.escHtml(payment.linkTicket)}" target="_blank" rel="noopener" class="ppill ppill-ticketing">${I18n.t('ticketing')}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`);
        else
          pills.push(`<span class="ppill ppill-ticketing-onsite">${I18n.t('ticketing_onsite')}</span>`);
      }
      if (pills.length) paymentHtml = `<div class="popup-payment">${pills.join('')}</div>`;
    }

    let streamingHtml = '';
    const artistName = event.artistName ?? null;
    if (artistName && f('streaming.enabled')) {
      const listen = event.listenArtist ?? {};
      const icons = _STREAM_SERVICES
        .filter(s => listen[s.key] === true && f(`streaming.${s.key}`))
        .map(s => `<a href="${Utils.escHtml(s.buildUrl(artistName))}" target="_blank" rel="noopener" class="stream-btn" style="background:${s.color}" aria-label="${s.label}">${s.svg}</a>`)
        .join('');
      if (icons) streamingHtml = `<div class="popup-streaming">${icons}</div>`;
    }

    let schedHtml = '';
    if (f('nextProgram')) {
      const sameDaySched   = Events.daySchedule(venueId, eventDate);
      const futureDaysSched = Events.events
        .filter(e => e.venueId === venueId && Time.dateStr(e.startTimestamp) > eventDate)
        .sort((a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp));
      const allSched = [...sameDaySched, ...futureDaysSched];
      const schedLabel = eventDate === todayStr ? I18n.t('today_schedule') : I18n.t('next_schedule');
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
    }

    return `
      <div class="popup-body-scroll">
        ${f('place') ? `<div class="popup-venue" style="color:var(--popup-p)">${Utils.escHtml(Utils.loc(venue.name, lang))}</div>` : ''}
        ${f('title') ? `<div class="popup-title">${Utils.escHtml(Utils.loc(event.title, lang))}</div>` : ''}
        <div class="popup-meta">${badge}${timeHtml}${cdHtml}</div>
        ${descHtml}
        ${paymentHtml}
        ${streamingHtml}
        ${distHtml}
        ${schedHtml}
      </div>
      ${btns ? `<div class="popup-btn-wrap">${btns}</div>` : ''}`;
  },

  // ─── Popup animation ─────────────────────────────────────────────
  showAnimPopup(animId) {
    const anim = Events.anims.find(a => a.id === animId);
    if (!anim) return;
    const theme = this.currentMeta?.theme;
    this.$popup?.setTheme(theme?.primary ?? '#e63012', theme?.secondary ?? '#fff');
    const name = Utils.escHtml(Utils.loc(anim.name, this.lang));
    const html = `
      <div class="popup-body-scroll">
        <div class="popup-venue" style="color:var(--popup-p)">${name}</div>
        <div class="popup-title">${I18n.t('no_event')}</div>
      </div>`;
    this.$popup?.show(html);
  },

  // ─── Partage ─────────────────────────────────────────────────────
  _buildShareBtn(venue, result, lang) {
    const venueName = Utils.loc(venue.name, lang);
    const url       = venue.go ?? `https://maps.google.com/?q=${venue.coords.lat},${venue.coords.lng}`;
    const event     = result?.event ?? null;
    const text = ShareMessage.build({
      venueName,
      feriaName: Utils.loc(this.currentMeta?.name, lang) ?? '',
      time:      event ? Time.timeStr(event.startTimestamp) : '',
      date:      event ? Time.dateStr(event.startTimestamp) : '',
      url,
      lang,
      hasEvent:  Boolean(event),
    });
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

  // ─── Compass / orientation ───────────────────────────────────────
  _setupCompass() {
    const onOrientation = (e) => {
      // iOS : webkitCompassHeading est le cap magnétique direct (0 = nord)
      if (e.webkitCompassHeading != null) {
        MapModule.updateUserHeading(e.webkitCompassHeading);
        return;
      }
      // Android / deviceorientationabsolute : alpha = rotation Z, 0 = est → convertir en cap
      if (e.absolute && e.alpha != null) {
        MapModule.updateUserHeading((360 - e.alpha) % 360);
      }
    };

    // Demande permission iOS 13+ (doit être dans un geste utilisateur → appelé depuis _requestGeolocation)
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(state => { if (state === 'granted') window.addEventListener('deviceorientation', onOrientation); })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientationabsolute', onOrientation);
      window.addEventListener('deviceorientation', onOrientation);
    }
  },

  // ─── Géolocalisation ─────────────────────────────────────────────
  _requestGeolocation() {
    this._setupCompass();
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
    const { latitude: lat, longitude: lng, heading } = pos.coords;
    MapModule.updateUserPos(lat, lng);
    if (heading != null) MapModule.updateUserHeading(heading);
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
