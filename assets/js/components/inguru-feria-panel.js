/**
 * <inguru-feria-panel>
 * Panneau de sélection des fêtes — grille responsive + image de ville.
 *
 * CustomEvents émis :
 *   inguru:feria-select { id }
 *
 * Méthodes :
 *   open()
 *   close()
 *   render(editions, lang, userPos, currentId, hexToRgb)
 *   isOpen()
 */

const _SVG_CATHEDRAL = `<svg viewBox="0 0 76 68" fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <polyline points="4,68 4,26 11,4 18,26 18,68" stroke-width="1.8"/>
  <line x1="4" y1="26" x2="18" y2="26" stroke-width="1.8"/>
  <line x1="11" y1="4" x2="11" y2="1" stroke-width="1.6"/>
  <line x1="8" y1="2.5" x2="14" y2="2.5" stroke-width="1.2"/>
  <path d="M7 30 L7 40 Q11 34 15 40 L15 30" stroke-width="1"/>
  <path d="M7 44 L7 54 Q11 48 15 54 L15 44" stroke-width="1"/>
  <polyline points="58,68 58,26 65,4 72,26 72,68" stroke-width="1.8"/>
  <line x1="58" y1="26" x2="72" y2="26" stroke-width="1.8"/>
  <line x1="65" y1="4" x2="65" y2="1" stroke-width="1.6"/>
  <line x1="62" y1="2.5" x2="68" y2="2.5" stroke-width="1.2"/>
  <path d="M61 30 L61 40 Q65 34 69 40 L69 30" stroke-width="1"/>
  <path d="M61 44 L61 54 Q65 48 69 54 L69 44" stroke-width="1"/>
  <rect x="18" y="38" width="40" height="30" rx="1" stroke-width="1.8"/>
  <polyline points="18,38 38,26 58,38" stroke-width="1.6"/>
  <circle cx="38" cy="32" r="3.5" stroke-width="1.4"/>
  <path d="M23,68 L23,55 Q28,49 33,55 L33,68" stroke-width="1.3"/>
  <path d="M31,68 L31,52 Q38,45 45,52 L45,68" stroke-width="1.5"/>
  <path d="M43,68 L43,55 Q48,49 53,55 L53,68" stroke-width="1.3"/>
</svg>`;

class InguruFeriaPanel extends HTMLElement {
  #open = false;

  connectedCallback() {
    this.innerHTML = `
      <div id="feria-panel">
        <div id="feria-sections"></div>
      </div>`;
  }

  isOpen() { return this.#open; }

  open() {
    this.#open = true;
    const panel = this.querySelector('#feria-panel');
    if (!panel) return;

    if (!panel.querySelector('.fp-search-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'fp-search-wrap';
      wrap.innerHTML = `
        <span class="fp-search-icon">🔍</span>
        <input class="fp-search" id="fp-search-input" type="search"
          placeholder="${I18n.t('search_feria')}" autocomplete="off" spellcheck="false">`;
      panel.insertBefore(wrap, panel.firstChild);
      panel.querySelector('#fp-search-input').addEventListener('input', (e) => {
        this.#renderGrid(e.target.value);
      });
    } else {
      const inp = panel.querySelector('#fp-search-input');
      if (inp) { inp.value = ''; inp.placeholder = I18n.t('search_feria'); }
    }

    this.#renderGrid('');
    panel.classList.add('open');
    setTimeout(() => panel.querySelector('#fp-search-input')?.focus(), 300);
  }

  close() {
    this.#open = false;
    this.querySelector('#feria-panel')?.classList.remove('open');
  }

  render(editions, lang, userPos, currentId, hexToRgb) {
    this._editions  = editions;
    this._lang      = lang;
    this._userPos   = userPos;
    this._currentId = currentId;
    this._hexToRgb  = hexToRgb;
  }

  // ─── Statut d'une édition ─────────────────────────────────────────
  #getStatus(f, today) {
    if (today >= (f.dates?.start ?? '') && today <= (f.dates?.end ?? '')) return 'live';
    if (today > (f.dates?.end ?? '')) return 'done';
    return f.isAvailable ? 'available' : 'upcoming';
  }

  // ─── Rendu de la grille ───────────────────────────────────────────
  #renderGrid(filter) {
    const { _editions: editions, _lang: lang, _userPos: userPos,
            _currentId: currentId, _hexToRgb: hexToRgb } = this;
    if (!editions) return;

    const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
                             .replace(/[-_]/g, ' ').toLowerCase();
    const query  = normalize(filter.trim());
    const today  = Time.todayStr();
    const statusOrder = { live: 0, available: 1, upcoming: 2, done: 3 };

    const list = editions
      .filter(f => {
        if (!query) return true;
        const name = normalize(Utils.loc(f.name, lang));
        const town = normalize(Utils.loc(f.town ?? f.name, lang));
        return name.includes(query) || town.includes(query);
      })
      .sort((a, b) => {
        const sa = statusOrder[this.#getStatus(a, today)];
        const sb = statusOrder[this.#getStatus(b, today)];
        if (sa !== sb) return sa - sb;
        return (a.dates?.start ?? '').localeCompare(b.dates?.start ?? '');
      });

    const container = this.querySelector('#feria-sections');
    container.innerHTML = '';

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'fp-empty';
      empty.textContent = I18n.t('search_no_result');
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'fp-grid';

    list.forEach((f, i) => {
      const status    = this.#getStatus(f, today);
      const isCurrent = f.id === currentId;
      const disabled  = !f.isAvailable || status === 'done';
      const cityId    = (f.cityId ?? f.id.split('-')[0]).toLowerCase();

      const pc = f.theme?.primary   ?? '#666';
      const sc = f.theme?.secondary ?? '#fff';
      const { r: pr, g: pg, b: pb } = hexToRgb(pc);
      const { r: sr, g: sg, b: sb } = hexToRgb(sc);

      const startD = new Date((f.dates?.start ?? '2000-01-01') + 'T12:00:00');
      const endD   = new Date((f.dates?.end   ?? '2000-01-01') + 'T12:00:00');
      const fmt    = d => d.toLocaleDateString(I18n.locale(lang), { day: 'numeric', month: 'short' });
      const dates  = `${fmt(startD)} – ${fmt(endD)}`;

      let distLabel = '';
      if (userPos && f.center) {
        const d = Utils.haversine(userPos.lat, userPos.lng, f.center.lat, f.center.lng);
        distLabel = `<span class="fp-card-dist">${Utils.formatDistance(d)}</span>`;
      }

      let badgeCls, badgeTxt;
      if (!f.isAvailable && status !== 'done') {
        badgeCls = 'fp-badge-upcoming';
        badgeTxt = I18n.t('status_unavailable');
      } else if (status === 'live') {
        badgeCls = 'fp-badge-live';
        badgeTxt = I18n.t('status_live');
      } else if (status === 'available') {
        const daysLeft = Math.ceil((startD - new Date()) / 86_400_000);
        badgeCls = 'fp-badge-available';
        badgeTxt = I18n.t('status_days_left', { n: daysLeft });
      } else if (status === 'done') {
        badgeCls = 'fp-badge-done';
        badgeTxt = I18n.t('status_past');
      } else {
        badgeCls = 'fp-badge-upcoming';
        badgeTxt = I18n.t('status_upcoming');
      }

      const isBayonne = cityId === 'bay';

      const card = document.createElement('button');
      card.className = `fp-card${isCurrent ? ' fp-card-active' : ''}${disabled ? ' fp-card-disabled' : ''}`;
      card.dataset.id = f.id;
      if (disabled) card.setAttribute('disabled', '');
      card.style.cssText = `--card-p:${pc};--card-s:${sc};--card-p-rgb:${pr},${pg},${pb};--delay:${i * 0.07}s`;

      card.innerHTML = `
        <div class="fp-card-img" style="background-image:url(assets/img/cities/${cityId}.jpg);
          background-color:rgba(${pr},${pg},${pb},0.18)"></div>
        ${isBayonne ? `<div class="fp-card-landmark">${_SVG_CATHEDRAL}</div>` : ''}
        <div class="fp-card-content">
          <div class="fp-card-name">${Utils.escHtml(Utils.loc(f.name, lang))}</div>
          <div class="fp-card-dates">${dates}</div>
          ${distLabel}
          <span class="fp-badge ${badgeCls}">${badgeTxt}</span>
        </div>`;

      if (!disabled) {
        card.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('inguru:feria-select', {
            bubbles: true, detail: { id: f.id }
          }));
        });
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }
}

customElements.define('inguru-feria-panel', InguruFeriaPanel);
