/**
 * app.js – Bootstrap principal
 */
const App = {
  lang:              'fr',
  activePopup:       null,
  festivalIndex:     [],
  currentFestivalMeta: null,
  _refreshTimer:     null,
  _panelOpen:        false,

  // ─── Debug step ──────────────────────────────────────────────────
  _step(msg) {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = msg;
    console.log('[Inguru]', msg);
  },

  // ─── Démarrage ───────────────────────────────────────────────────
  async init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Init i18n depuis la langue détectée (inline, aucun fetch)
    this.lang = I18n.detect();
    I18n.set(this.lang);

    const timeout = setTimeout(() => {
      const lt  = document.getElementById('loading-text');
      const msg = lt ? 'Bloqué à : ' + lt.textContent : 'Timeout';
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error-text').textContent = msg;
      document.getElementById('error-screen').classList.remove('hidden');
    }, 12_000);

    try {
      this._step('Lecture de data/index.json…');
      const index = await Events.loadIndex();
      this.festivalIndex = index.festivals;

      const active = Events.selectActive(this.festivalIndex);
      this._step(`Festival : ${active.id}…`);
      await this._loadFestival(active, false);

      this._buildFestivalPanel();
      this._setupFestivalBtn();
      this._setupScrim();
      this._setupPopup();
      this._setupFabLocate();
      this._setupLangMenu();

      clearTimeout(timeout);
      document.getElementById('loading').classList.add('hidden');

    } catch (err) {
      clearTimeout(timeout);
      console.error('[App] init error:', err);
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error-text').textContent =
        (document.getElementById('loading-text')?.textContent ?? '') + ' → ' + err.message;
      document.getElementById('error-screen').classList.remove('hidden');
    }
  },

  // ─── Chargement d'un festival ────────────────────────────────────
  async _loadFestival(meta, animate = true) {
    this.currentFestivalMeta = meta;
    this._applyTheme(meta.theme);

    Events.festival = {
      id: meta.id, name: meta.name,
      center: meta.center, defaultZoom: meta.defaultZoom ?? 15,
      theme: meta.theme
    };
    Events.venues = [];
    Events.events = [];

    try {
      await Events.load(meta.id);
    } catch (err) {
      console.warn(`[App] données manquantes pour "${meta.id}" :`, err.message);
    }

    if (!MapModule.map) {
      MapModule.init(Events.festival);
    }
    MapModule.renderAll(this.lang);

    if (animate && MapModule.map) {
      MapModule.map.flyTo([meta.center.lat, meta.center.lng], 15, { duration: 1.2 });
    }

    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      MapModule.renderAll(this.lang);
      if (this.activePopup) this._renderPopup(this.activePopup);
    }, 60_000);

    document.getElementById('festival-btn-emoji').textContent = meta.emoji ?? '🎉';
    document.getElementById('festival-btn-name').textContent  = Utils.loc(meta.name, this.lang);
    document.getElementById('panel-label').textContent        = I18n.t('pick_festival');

    if (!MapModule._geoStarted) {
      MapModule._geoStarted = true;
      this._startGeolocation();
    }

    this.closePopup();
  },

  // ─── Thème couleurs ──────────────────────────────────────────────
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
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = p;
  },

  _hexToRgb(hex) {
    const n = parseInt(hex.replace('#',''), 16);
    return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
  },

  // ─── Festival Picker Panel ───────────────────────────────────────
  _buildFestivalPanel() {
    const grid    = document.getElementById('festival-grid');
    const today   = Time.todayStr();
    const lang    = this.lang;
    const current = this.currentFestivalMeta?.id;

    grid.innerHTML = this.festivalIndex.map(f => {
      const isActive  = today >= f.dates.start && today <= f.dates.end;
      const isPast    = today > f.dates.end;
      const isCurrent = f.id === current;
      const pc = f.theme?.primary   ?? '#666';
      const sc = f.theme?.secondary ?? '#fff';
      const { r:pr,g:pg,b:pb } = this._hexToRgb(pc);
      const { r:sr,g:sg,b:sb } = this._hexToRgb(sc);
      const grad  = `linear-gradient(135deg,rgba(${pr},${pg},${pb},0.18) 0%,rgba(${sr},${sg},${sb},0.05) 100%)`;
      const startD = new Date(f.dates.start + 'T12:00:00');
      const endD   = new Date(f.dates.end   + 'T12:00:00');
      const fmt    = d => d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
      const dates  = `${fmt(startD)} – ${fmt(endD)} ${startD.getFullYear()}`;
      let badge = '';
      if (isActive)    badge = `<span class="card-badge card-badge-active">● En cours</span>`;
      else if (isPast) badge = `<span class="card-badge card-badge-done">Terminé</span>`;
      else             badge = `<span class="card-badge card-badge-soon">À venir</span>`;

      return `<div class="festival-card${isCurrent?' active':''}"
           style="--card-gradient:${grad}" data-id="${f.id}"
           onclick="App._selectFestival('${f.id}')">
        <div class="card-dot-row">
          <div class="card-dot" style="background:${pc}"></div>
          <div class="card-dot" style="background:${sc};opacity:0.6"></div>
        </div>
        <span class="card-emoji">${f.emoji??'🎉'}</span>
        <div class="card-city">${Utils.escHtml(f.city)}</div>
        <div class="card-festname">${Utils.escHtml(Utils.loc(f.name,lang))}</div>
        <div class="card-dates">${dates}</div>
        ${badge}
      </div>`;
    }).join('');
  },

  async _selectFestival(id) {
    const meta = this.festivalIndex.find(f => f.id === id);
    if (!meta) return;
    document.querySelectorAll('.festival-card').forEach(c => c.classList.toggle('active', c.dataset.id===id));
    this._closeFestivalPanel();
    await this._loadFestival(meta, true);
    this._buildFestivalPanel();
  },

  // ─── Géolocalisation ─────────────────────────────────────────────
  _startGeolocation(forceRequest = false) {
    if (!navigator.geolocation) return;

    const success = (pos) => {
      const { latitude:lat, longitude:lng } = pos.coords;
      MapModule.updateUserPos(lat, lng);
      document.getElementById('fab-locate')?.classList.add('active');

      if (!MapModule._firstFix) {
        MapModule._firstFix = true;
        const c = this.currentFestivalMeta?.center;
        if (c && Utils.haversine(lat,lng,c.lat,c.lng) < 10_000) {
          MapModule.map.flyTo([lat,lng], 16, { duration:1 });
        }
      }
      if (this.activePopup) this._renderPopup(this.activePopup);
    };

    const error = (err) => {
      console.warn('[Geoloc]', err.message);
      if (err.code === 1 && forceRequest) {
        // Permission refusée — informer l'utilisateur
        this._showToast('Autorisez la localisation dans les réglages');
      }
    };

    navigator.geolocation.watchPosition(success, error,
      { enableHighAccuracy:true, maximumAge:10_000, timeout:8_000 });
  },

  // ─── Popup ───────────────────────────────────────────────────────
  showPopup(venueId, latlng) {
    this.activePopup = venueId;
    const popup = document.getElementById('event-popup');
    this._renderPopup(venueId);
    popup.classList.remove('hidden');
    requestAnimationFrame(() => {
      popup.classList.add('visible');
    });
  },

  closePopup() {
    this.activePopup = null;
    const popup = document.getElementById('event-popup');
    popup.classList.remove('visible');
    popup.classList.add('hidden');
  },

  _renderPopup(venueId) {
    const lang   = this.lang;
    const venue  = Events.venue(venueId);
    const result = Events.currentOrNext(venueId);
    const sched  = Events.todaySchedule(venueId);
    if (!venue) return;

    // Bouton Y aller
    const venueGo  = venue.go ?? null;
    const navLabel = Utils.escHtml(Utils.loc(venue.name, lang));
    const goBtn = `<button class="popup-nav-btn"
      onclick="Utils.openDirections(${venue.coords.lat},${venue.coords.lng},'${navLabel}',${venueGo?`'${venueGo}'`:'null'})">
      🗺️ ${I18n.t('go_there')}
    </button>`;

    // Bouton Prévenir mes potes
    const shareBtn = this._buildShareBtn(venue, result, lang);

    // Distance
    let distHtml = '';
    if (MapModule.userPos) {
      const dist    = Utils.haversine(MapModule.userPos.lat, MapModule.userPos.lng, venue.coords.lat, venue.coords.lng);
      const walkMin = Utils.walkingMinutes(dist);
      distHtml = `<div class="popup-dist">
        <span class="popup-dist-icon">🚶</span>
        <div>
          <div class="popup-dist-main">${Utils.formatDistance(dist)} · ~${walkMin} min</div>
          <div class="popup-dist-sub">${I18n.t('as_crow_flies')}</div>
        </div>
      </div>`;
    }

    const btns = `<div class="popup-btn-row">${goBtn}${shareBtn}</div>`;

    if (!result) {
      document.getElementById('popup-content').innerHTML = `
        <div class="popup-venue">${Utils.escHtml(Utils.loc(venue.name,lang))}</div>
        <div class="popup-title">${I18n.t('no_event')}</div>
        ${distHtml}${btns}`;
      return;
    }

    const { event, status } = result;
    const badgeLabel = { now:I18n.t('status_now'), next:I18n.t('status_next'), done:I18n.t('status_done') };
    const badge = `<span class="badge badge-${status}">${badgeLabel[status]}</span>`;

    let cdHtml = '';
    if (status==='next') {
      const m = Time.minutesUntilStart(event);
      cdHtml  = `<span class="countdown">⏱ ${I18n.t('in')} ${Time.formatCountdown(m)}</span>`;
    } else if (status==='now') {
      const r = Time.minutesUntilEnd(event);
      if (r>0) cdHtml = `<span class="countdown-running">⏳ ${I18n.t('remaining')} ${Time.formatCountdown(r)}</span>`;
    }

    const startTime = Time.timeStr(event.startTimestamp);
    const endTime   = event.endTimestamp ? Time.timeStr(event.endTimestamp) : '';
    const timeRange = endTime ? `${startTime}–${endTime}` : startTime;

    const tags = (event.tags??[]).map(t => {
      const isFree = ['gratuit','free','libre'].includes(t);
      return `<span class="tag ${isFree?'tag-free':''}">${Utils.escHtml(t)}</span>`;
    }).join('');
    const tagsHtml = tags ? `<div class="popup-tags">${tags}</div>` : '';

    const desc    = Utils.loc(event.description, lang);
    const descHtml = desc ? `<p class="popup-desc">${Utils.escHtml(desc)}</p>` : '';

    let schedHtml = '';
    if (sched.length > 1) {
      const items = sched.map(e => {
        const st     = Time.status(e);
        const active = e.id === event.id;
        const done   = st === 'done';
        const t      = Utils.escHtml(Utils.loc(e.title, lang));
        const ts     = Time.timeStr(e.startTimestamp);
        const te     = e.endTimestamp ? Time.timeStr(e.endTimestamp) : '';
        const slot   = te ? `${ts}–${te}` : ts;
        return `<div class="schedule-item${active?' is-active':''}${done?' is-done':''}">
          <span class="schedule-time">${slot}</span>
          <span class="schedule-title">${t}</span>
        </div>`;
      }).join('');
      schedHtml = `<div class="popup-divider"></div>
        <div class="schedule-label">${I18n.t('today_schedule')}</div>${items}`;
    }

    document.getElementById('popup-content').innerHTML = `
      <div class="popup-venue">${Utils.escHtml(Utils.loc(venue.name,lang))}</div>
      <div class="popup-title">${Utils.escHtml(Utils.loc(event.title,lang))}</div>
      <div class="popup-meta">${badge}<span>🕐 ${timeRange}</span>${cdHtml}</div>
      ${tagsHtml}${descHtml}${distHtml}
      ${schedHtml}
      <div style="margin-top:14px">${btns}</div>`;
  },

  _buildShareBtn(venue, result, lang) {
    const venueName = Utils.loc(venue.name, lang);
    const goUrl     = venue.go ?? `https://maps.google.com/?q=${venue.coords.lat},${venue.coords.lng}`;
    let text;
    if (result?.event) {
      const t = Time.timeStr(result.event.startTimestamp);
      text = `Je serai à ${venueName} à ${t} — rejoins-moi ! ${goUrl}`;
    } else {
      text = `Je suis à ${venueName} — rejoins-moi ! ${goUrl}`;
    }
    const encoded = text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    return `<button class="popup-share-btn" onclick="App._share('${encoded}')">
      💬 ${I18n.t('share_pals')}
    </button>`;
  },

  async _share(text) {
    const decoded = text.replace(/\\'/g,"'").replace(/\\"/g,'"');
    if (navigator.share) {
      try { await navigator.share({ text: decoded }); return; }
      catch(e) { return; }
    }
    try {
      await navigator.clipboard.writeText(decoded);
      this._showToast(I18n.t('copied'));
    } catch(e) {
      this._showToast(decoded);
    }
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

  // ─── Festival panel open/close ───────────────────────────────────
  _openFestivalPanel() {
    this._panelOpen = true;
    document.getElementById('festival-panel').classList.add('open');
    document.getElementById('festival-btn').classList.add('open');
    document.getElementById('scrim').classList.add('visible');
    this.closePopup();
  },

  _closeFestivalPanel() {
    this._panelOpen = false;
    document.getElementById('festival-panel').classList.remove('open');
    document.getElementById('festival-btn').classList.remove('open');
    document.getElementById('scrim').classList.remove('visible');
  },

  // ─── UI setup ────────────────────────────────────────────────────
  _setupFestivalBtn() {
    document.getElementById('festival-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this._panelOpen ? this._closeFestivalPanel() : this._openFestivalPanel();
    });
  },

  _setupScrim() {
    document.getElementById('scrim').addEventListener('click', () => {
      this._closeFestivalPanel();
      document.getElementById('lang-menu').classList.add('hidden');
    });
  },

  _setupPopup() {
    document.getElementById('popup-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePopup();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.closePopup(); this._closeFestivalPanel(); }
    });
  },

  _setupFabLocate() {
    const fab = document.getElementById('fab-locate');
    if (!fab) return;
    fab.addEventListener('click', () => {
      if (MapModule.userPos) {
        // Position déjà connue → recentrer
        MapModule.centerOnUser();
      } else {
        // Pas encore de position → demander explicitement
        fab.textContent = '⏳';
        this._startGeolocation(true);
        // Remet l'icône après 3s si toujours pas de fix
        setTimeout(() => {
          if (!MapModule.userPos) fab.textContent = '📍';
        }, 3000);
      }
    });
  },

  _setupLangMenu() {
    const btn  = document.getElementById('lang-btn');
    const menu = document.getElementById('lang-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => menu.classList.add('hidden'));

    menu.querySelectorAll('button[data-lang]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.lang = e.currentTarget.dataset.lang;
        I18n.set(this.lang);
        menu.classList.add('hidden');

        // Rafraîchit tout
        document.getElementById('festival-btn-name').textContent =
          Utils.loc(this.currentFestivalMeta.name, this.lang);
        document.getElementById('panel-label').textContent = I18n.t('pick_festival');
        this._buildFestivalPanel();
        MapModule.renderAll(this.lang);
        if (this.activePopup) this._renderPopup(this.activePopup);
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
