/**
 * app.js – Bootstrap principal Inguru
 */
const App = {
  lang:              'fr',
  activePopup:       null,
  _cityCache:        {},   // { cityId → city.json data } pour le panneau picker
  festivalIndex:     [],
  currentFestivalMeta: null,
  _refreshTimer:     null,
  _panelOpen:        false,

  _step(msg) {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = msg;
    console.log('[Inguru]', msg);
  },

  // ─── Init ────────────────────────────────────────────────────────
  async init() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    this.lang = I18n.detect();
    I18n.set(this.lang);

    const timeout = setTimeout(() => {
      const lt = document.getElementById('loading-text');
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error-text').textContent = lt ? 'Bloqué : ' + lt.textContent : 'Timeout';
      document.getElementById('error-screen').classList.remove('hidden');
    }, 12_000);

    try {
      this._step(I18n.t('loading'));
      const [index] = await Promise.all([
        Events.loadIndex(),
        Events.loadConfig(),
      ]);
      // L'index contient maintenant des "editions" (pas "festivals")
      this.festivalIndex = index.editions ?? index.festivals ?? [];

      // Pré-charge les city.json pour le panneau picker (parallèle)
      await this._preloadCities();

      // Enrichit chaque édition avec les dates depuis edition.json si manquantes
      await this._enrichEditions();

      const active = Events.selectActive(this.festivalIndex);
      await this._loadFestival(active, false);

      this._buildFestivalPanel();
      this._setupFestivalBtn();
      this._setupScrim();
      this._setupPopup();
      this._setupFabs();
      this._setupLangMenu();

      // Demande la localisation immédiatement à chaque ouverture
      this._requestGeolocation();

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

  // ─── Chargement festival ─────────────────────────────────────────
  async _loadFestival(meta, animate = true) {
    // Réinitialise les données avant chargement
    Events.venues = [];
    Events.events = [];

    // 1. Charge TOUT depuis le disque — city.json, festival.json, edition.json, venues, events
    try {
      const loaded = await Events.load(meta);
      // Fusionne dans le meta (ajoute center, theme, dates, name, emoji…)
      Object.assign(meta, loaded);
      // Propage dans festivalIndex pour que le panneau picker soit à jour
      const idx = this.festivalIndex.findIndex(f => f.id === meta.id);
      if (idx >= 0) Object.assign(this.festivalIndex[idx], loaded);
    } catch (err) {
      console.error(`[App] Impossible de charger "${meta.id}":`, err.message);
      // Arrête ici — pas de carte sans données minimales
      throw err;
    }

    // 2. Maintenant que meta est enrichi, applique le thème
    this.currentFestivalMeta = meta;
    this._applyTheme(meta.theme);

    // 3. Initialise la carte (center et defaultZoom sont disponibles)
    if (!MapModule.map) {
      MapModule.init({
        center:      meta.center,
        defaultZoom: meta.defaultZoom ?? 15,
      });
    } else if (animate) {
      MapModule.map.flyTo([meta.center.lat, meta.center.lng], meta.defaultZoom ?? 15, { duration: 1.2 });
    }

    MapModule.renderAll(this.lang);

    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      MapModule.renderAll(this.lang);
      if (this.activePopup) this._renderPopup(this.activePopup);
    }, 60_000);

    // 4. Met à jour le header
    // Affiche le nom de la fête (pas la ville) dans le header
    const festName = Utils.loc(meta.name, this.lang);
    // emoji supprimé
    document.getElementById('festival-btn-name').textContent  = festName;

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
    // Couleur secondaire aussi
    const { r:sr, g:sg, b:sb } = this._hexToRgb(s);
    root.style.setProperty('--s-rgb', `${sr},${sg},${sb}`);
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = p;
  },

  _hexToRgb(hex) {
    const n = parseInt(hex.replace('#',''), 16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  },

  // ─── Pré-chargement des villes pour le panneau ──────────────────
  async _preloadCities() {
    const cityIds = [...new Set(this.festivalIndex.map(e => e.cityId).filter(Boolean))];
    await Promise.all(cityIds.map(async (cityId) => {
      try {
        const res = await fetch(`data/cities/${cityId}/city.json`);
        if (res.ok) this._cityCache[cityId] = await res.json();
      } catch(e) { /* ville non encore créée */ }
    }));
  },

  // ─── Enrichit les éditions avec les dates depuis edition.json ────
  async _enrichEditions() {
    // Pour chaque édition qui n'a pas encore de dates dans l'index
    await Promise.all(this.festivalIndex.map(async (ed) => {
      if (ed.dates) return; // déjà dans l'index
      if (!ed.cityId || !ed.festivalId || !ed.year) return;
      try {
        const res = await fetch(`data/cities/${ed.cityId}/festivals/${ed.festivalId}/${ed.year}/edition.json`);
        if (res.ok) {
          const data = await res.json();
          ed.dates       = data.dates;
          ed.defaultZoom = data.defaultZoom;
        }
      } catch(e) {}
      // Récupère aussi nom + emoji depuis festival.json si manquant
      if (!ed.name || !ed.emoji) {
        try {
          const res = await fetch(`data/cities/${ed.cityId}/festivals/${ed.festivalId}/festival.json`);
          if (res.ok) {
            const data = await res.json();
            if (!ed.name)  ed.name  = data.name;
            if (!ed.theme) ed.theme = data.theme; // thème depuis festival.json
          }
        } catch(e) {}
      }
      // Récupère thème + catégorie + coords depuis city.json si en cache
      const city = this._cityCache[ed.cityId];
      if (city) {
        if (!ed.city)     ed.city     = city.name;
        if (!ed.center)   ed.center   = city.center;
        if (!ed.category) ed.category = city.category;
        // theme vient de festival.json, pas de city.json
      }
    }));
  },

  // ─── Festival Picker — style Apple, 3 sections ───────────────────
  _buildFestivalPanel(filter = '') {
    const lang    = this.lang;
    const today   = Time.todayStr();
    const current = this.currentFestivalMeta?.id;
    const userPos = MapModule.userPos;

    // Normalisation pour la recherche (sans accents, sans tirets, minuscules)
    const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                             .replace(/[-_]/g,' ').toLowerCase();
    const query = normalize(filter.trim());

    const categories = [
      { key: 'large',  label: I18n.t('section_large') },
      { key: 'medium', label: I18n.t('section_medium') },
      { key: 'small',  label: I18n.t('section_small') },
    ];

    const container = document.getElementById('festival-sections');
    container.innerHTML = '';

    for (const cat of categories) {
      let festivals = this.festivalIndex
        .filter(f => {
          if (f.category !== cat.key) return false;
          if (!query) return true;
          const name = normalize(Utils.loc(f.name, lang));
          const city = normalize(Utils.loc(f.city ?? f.name, lang));
          return name.includes(query) || city.includes(query);
        })
        .sort((a, b) => {
          const aOver = today > a.dates.end;
          const bOver = today > b.dates.end;
          // Les festivals terminés vont toujours à droite
          if (aOver !== bOver) return aOver ? 1 : -1;
          // Parmi les non-terminés : tri par distance ou date
          if (userPos) {
            const da = Utils.haversine(userPos.lat, userPos.lng, a.center.lat, a.center.lng);
            const db = Utils.haversine(userPos.lat, userPos.lng, b.center.lat, b.center.lng);
            return da - db;
          }
          return a.dates.start.localeCompare(b.dates.start);
        });

      if (festivals.length === 0) continue;

      const section = document.createElement('div');
      section.className = 'fp-section';
      section.innerHTML = `<div class="fp-section-title">${cat.label}</div>`;

      const scroll = document.createElement('div');
      scroll.className = 'fp-scroll';

      for (const f of festivals) {
        const isActive  = today >= f.dates.start && today <= f.dates.end;
        const isPast    = today > f.dates.end;
        const isCurrent = f.id === current;
        const pc = f.theme?.primary   ?? '#666';
        const sc = f.theme?.secondary ?? '#fff';
        const { r:pr,g:pg,b:pb } = this._hexToRgb(pc);
        const { r:sr,g:sg,b:sb } = this._hexToRgb(sc);
        const grad = `linear-gradient(145deg,rgba(${pr},${pg},${pb},0.22) 0%,rgba(${sr},${sg},${sb},0.06) 100%)`;

        const startD = new Date(f.dates.start + 'T12:00:00');
        const endD   = new Date(f.dates.end   + 'T12:00:00');
        const fmt    = d => d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
        const dates  = `${fmt(startD)} – ${fmt(endD)}`;

        let distLabel = '';
        if (userPos) {
          const d = Utils.haversine(userPos.lat, userPos.lng, f.center.lat, f.center.lng);
          distLabel = `<span class="fp-card-dist">${Utils.formatDistance(d)}</span>`;
        }

        let badge = '';
        if (isActive)    badge = `<span class="fp-badge fp-badge-active">${I18n.t('status_active')}</span>`;
        else if (isPast) badge = `<span class="fp-badge fp-badge-done">${I18n.t('status_past')}</span>`;
        else             badge = `<span class="fp-badge fp-badge-soon">${I18n.t('status_upcoming')}</span>`;

        const festName = Utils.loc(f.name, lang);

        const card = document.createElement('button');
        card.className = `fp-card${isCurrent?' fp-card-active':''}`;
        card.dataset.id  = f.id;
        card.dataset.cat = cat.key;
        card.style.cssText = `--card-gradient:${grad};--card-p:${pc};--card-s:${sc}`;
        card.innerHTML = `
          <div class="fp-card-city">${Utils.escHtml(festName)}</div>
          <div class="fp-card-dates">${dates}</div>
          ${distLabel}
          ${badge}`;
        card.addEventListener('click', () => this._selectFestival(f.id));
        scroll.appendChild(card);
      }

      section.appendChild(scroll);
      container.appendChild(section);
    }
  },

  async _selectFestival(id) {
    const meta = this.festivalIndex.find(f => f.id === id);
    if (!meta) return;
    document.querySelectorAll('.fp-card').forEach(c => c.classList.toggle('fp-card-active', c.dataset.id===id));
    this._closeFestivalPanel();
    await this._loadFestival(meta, true);
    this._buildFestivalPanel();
  },

  // ─── Géolocalisation ─────────────────────────────────────────────
  _requestGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => this._onGeoSuccess(pos),
      (err) => {
        if (err.code === 1) this._showToast(I18n.t('geoloc_denied'));
        // Même en cas d'erreur, lance le watch pour les prochaines positions
        this._startWatch();
      },
      { enableHighAccuracy: true, timeout: 8_000 }
    );
  },

  _startWatch() {
    if (MapModule._geoStarted) return;
    MapModule._geoStarted = true;
    navigator.geolocation.watchPosition(
      (pos) => this._onGeoSuccess(pos),
      (err) => console.warn('[Geoloc]', err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 8_000 }
    );
  },

  _onGeoSuccess(pos) {
    const { latitude:lat, longitude:lng } = pos.coords;
    MapModule.updateUserPos(lat, lng);
    document.getElementById('fab-locate')?.classList.add('active');
    document.getElementById('fab-share-loc')?.classList.remove('hidden');

    if (!MapModule._firstFix) {
      MapModule._firstFix = true;
      const c = this.currentFestivalMeta?.center;
      if (c && Utils.haversine(lat,lng,c.lat,c.lng) < 10_000)
        MapModule.map.flyTo([lat,lng], 16, { duration: 1 });
      // Rebuild le panel avec les distances maintenant connues
      this._buildFestivalPanel();
    }
    if (this.activePopup) this._renderPopup(this.activePopup);
    this._startWatch();
  },

  // ─── Popup ───────────────────────────────────────────────────────
  showPopup(venueId) {
    this.activePopup = venueId;
    this._renderPopup(venueId);
    const popup = document.getElementById('event-popup');
    popup.classList.remove('hidden');
    requestAnimationFrame(() => popup.classList.add('visible'));
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
    if (!venue) return;

    // Couleurs du festival courant pour le popup
    const theme = this.currentFestivalMeta?.theme;
    const pc = theme?.primary   ?? 'var(--p)';
    const sc = theme?.secondary ?? 'var(--s)';
    const popup = document.getElementById('event-popup');
    popup.style.setProperty('--popup-p', pc);
    popup.style.setProperty('--popup-s', sc);
    const { r,g,b } = this._hexToRgb(pc);
    popup.style.setProperty('--popup-p-a18', `rgba(${r},${g},${b},0.18)`);
    popup.style.setProperty('--popup-p-a35', `rgba(${r},${g},${b},0.35)`);
    popup.style.setProperty('--popup-p-a60', `rgba(${r},${g},${b},0.60)`);

    // Boutons d'action
    const venueGo  = venue.go ?? null;
    const navLabel = Utils.escHtml(Utils.loc(venue.name, lang));
    const goBtn    = `<button class="popup-nav-btn"
      onclick="Utils.openDirections(${venue.coords.lat},${venue.coords.lng},'${navLabel}',${venueGo?`'${venueGo}'`:'null'})">
      🗺️ ${I18n.t('go_there')}
    </button>`;
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

    // Badge avec couleurs festival
    const badgeMap = { now: I18n.t('status_now'), next: I18n.t('status_next'), done: I18n.t('status_done') };
    const badge = `<span class="badge badge-${status}" style="background:${status==='now'?`var(--popup-p)`:''}; color:${status==='now'?`var(--popup-s)`:''}">${badgeMap[status]}</span>`;

    let cdHtml = '';
    if (status==='next') {
      const m = Time.minutesUntilStart(event);
      cdHtml  = `<span class="countdown">⏱ ${I18n.t('in')} ${Time.formatCountdown(m)}</span>`;
    } else if (status==='now') {
      const r2 = Time.minutesUntilEnd(event);
      if (r2>0) cdHtml = `<span class="countdown-running">⏳ ${I18n.t('remaining')} ${Time.formatCountdown(r2)}</span>`;
    }

    const startTime = Time.timeStr(event.startTimestamp);
    const endTime   = event.endTimestamp ? Time.timeStr(event.endTimestamp) : '';
    const timeRange = endTime ? `${startTime}–${endTime}` : startTime;

    // Date si pas aujourd'hui
    const eventDate   = Time.dateStr(event.startTimestamp);
    const todayStr    = Time.todayStr();
    let dateChip = '';
    if (eventDate !== todayStr) {
      const d    = new Date(event.startTimestamp);
      const opts = { weekday:'long', day:'numeric', month:'long' };
      dateChip   = `<div class="popup-date-chip">📅 ${d.toLocaleDateString(lang+'-FR', opts)}</div>`;
    }

    const tags = (event.tags??[]).map(t => {
      const isFree = ['gratuit','free','libre'].includes(t);
      return `<span class="tag ${isFree?'tag-free':''}">${Utils.escHtml(t)}</span>`;
    }).join('');
    const tagsHtml = tags ? `<div class="popup-tags">${tags}</div>` : '';

    const desc    = Utils.loc(event.description, lang);
    const descHtml = desc ? `<p class="popup-desc">${Utils.escHtml(desc)}</p>` : '';

    // Programme du jour de l'événement (peut être un jour futur)
    const sched = Events.daySchedule(venueId, eventDate);
    let schedHtml = '';
    const schedLabel = eventDate === todayStr ? I18n.t('today_schedule') : I18n.t('next_schedule');
    if (sched.length > 1) {
      const items = sched.map(e => {
        const st     = Time.status(e);
        const active = e.id === event.id;
        const done   = st === 'done' && !active;
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
        <div class="schedule-label">${schedLabel}</div>${items}`;
    }

    document.getElementById('popup-content').innerHTML = `
      <div class="popup-venue" style="color:var(--popup-p)">${Utils.escHtml(Utils.loc(venue.name,lang))}</div>
      <div class="popup-title">${Utils.escHtml(Utils.loc(event.title,lang))}</div>
      ${dateChip}
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
    return `<button class="popup-share-btn" onclick="App._share('${text.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
      💬 ${I18n.t('share_pals')}
    </button>`;
  },

  async _share(text) {
    const decoded = text.replace(/\\'/g,"'").replace(/\\"/g,'"');
    if (navigator.share) {
      try { await navigator.share({ text: decoded }); return; }
      catch(e) { return; }
    }
    try { await navigator.clipboard.writeText(decoded); this._showToast(I18n.t('copied')); }
    catch(e) { this._showToast(decoded); }
  },

  async _shareLocation() {
    const pos = MapModule.userPos;
    if (!pos) { this._showToast(I18n.t('no_position')); return; }
    const mapsUrl = `https://maps.google.com/?q=${pos.lat},${pos.lng}`;
    const text    = I18n.t('share_loc_msg') + mapsUrl;
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

  // ─── Festival panel ───────────────────────────────────────────────
  _openFestivalPanel() {
    this._panelOpen = true;
    // Injecte la barre de recherche si elle n'existe pas encore
    const panel = document.getElementById('festival-panel');
    if (!panel.querySelector('.fp-search-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'fp-search-wrap';
      wrap.innerHTML = `
        <span class="fp-search-icon">🔍</span>
        <input class="fp-search" type="search" id="fp-search-input"
          placeholder="${I18n.t('search_festival')}" autocomplete="off" spellcheck="false">`;
      panel.insertBefore(wrap, panel.firstChild);
      document.getElementById('fp-search-input').addEventListener('input', (e) => {
        this._buildFestivalPanel(e.target.value);
      });
    } else {
      // Reset la recherche à chaque ouverture
      const input = document.getElementById('fp-search-input');
      if (input) { input.value = ''; input.placeholder = I18n.t('search_festival'); }
      this._buildFestivalPanel('');
    }
    panel.classList.add('open');
    document.getElementById('festival-btn').classList.add('open');
    document.getElementById('scrim').classList.add('visible');
    this.closePopup();
    // Focus sur la recherche (desktop)
    setTimeout(() => document.getElementById('fp-search-input')?.focus(), 300);
  },

  _closeFestivalPanel() {
    this._panelOpen = false;
    document.getElementById('festival-panel').classList.remove('open');
    document.getElementById('festival-btn').classList.remove('open');
    document.getElementById('scrim').classList.remove('visible');
  },

  // ─── UI Setup ─────────────────────────────────────────────────────
  _setupFestivalBtn() {
    document.getElementById('festival-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this._panelOpen ? this._closeFestivalPanel() : this._openFestivalPanel();
    });
  },

  _setupScrim() {
    document.getElementById('scrim').addEventListener('click', () => {
      this._closeFestivalPanel();
      document.getElementById('lang-menu')?.classList.add('hidden');
    });
  },

  _setupPopup() {
    document.getElementById('popup-close').addEventListener('click', (e) => {
      e.stopPropagation(); this.closePopup();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key==='Escape') { this.closePopup(); this._closeFestivalPanel(); }
    });
  },

  _setupFabs() {
    // FAB localisation
    document.getElementById('fab-locate').addEventListener('click', () => {
      if (MapModule.userPos) {
        MapModule.centerOnUser();
      } else {
        document.getElementById('fab-locate').textContent = '⏳';
        this._requestGeolocation();
        setTimeout(() => {
          if (!MapModule.userPos) document.getElementById('fab-locate').textContent = '📍';
        }, 4000);
      }
    });

    // FAB partager position
    document.getElementById('fab-share-loc').addEventListener('click', () => {
      this._shareLocation();
    });
  },

  _setupLangMenu() {
    const btn  = document.getElementById('lang-btn');
    const menu = document.getElementById('lang-menu');
    if (!btn||!menu) return;

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

        const festName = Utils.loc(this.currentFestivalMeta?.name, this.lang);
        document.getElementById('festival-btn-name').textContent = festName;
        this._buildFestivalPanel('');
        MapModule.renderAll(this.lang);
        if (this.activePopup) this._renderPopup(this.activePopup);
        // Met à jour le placeholder de recherche si le panel est ouvert
        const si = document.getElementById('fp-search-input');
        if (si) si.placeholder = I18n.t('search_festival');
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());