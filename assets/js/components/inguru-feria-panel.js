/**
 * <inguru-feria-panel>
 * Panneau de sélection des ferias — style Apple, 3 sections + recherche.
 *
 * CustomEvents émis :
 *   inguru:feria-select { id } — une feria a été sélectionnée
 *
 * Méthodes :
 *   open()
 *   close()
 *   render(editions, lang, userPos, currentId, hexToRgb)
 *   isOpen()
 */
class InguruFeriaPanel extends HTMLElement {
  #open = false;

  connectedCallback() {
    this.innerHTML = `
      <div id="feria-panel">
        <div id="feria-sections"></div>
      </div>`;
  }

  // ─── Méthodes publiques ───────────────────────────────────────────

  isOpen()  { return this.#open; }

  open() {
    this.#open = true;
    const panel = this.querySelector('#feria-panel');
    if (!panel) return;

    // Injecte la barre de recherche une seule fois
    if (!panel.querySelector('.fp-search-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'fp-search-wrap';
      wrap.innerHTML = `
        <span class="fp-search-icon">🔍</span>
        <input class="fp-search" id="fp-search-input" type="search"
          placeholder="${I18n.t('search_feria')}" autocomplete="off" spellcheck="false">`;
      panel.insertBefore(wrap, panel.firstChild);
      panel.querySelector('#fp-search-input').addEventListener('input', (e) => {
        this.#renderSections(e.target.value);
      });
    } else {
      const inp = panel.querySelector('#fp-search-input');
      if (inp) { inp.value = ''; inp.placeholder = I18n.t('search_feria'); }
      this.#renderSections('');
    }

    panel.classList.add('open');
    setTimeout(() => panel.querySelector('#fp-search-input')?.focus(), 300);
  }

  close() {
    this.#open = false;
    this.querySelector('#feria-panel')?.classList.remove('open');
  }

  /**
   * Fournit les données nécessaires au rendu et mémorise pour la recherche.
   */
  render(editions, lang, userPos, currentId, hexToRgb) {
    this._editions   = editions;
    this._lang       = lang;
    this._userPos    = userPos;
    this._currentId  = currentId;
    this._hexToRgb   = hexToRgb;
    this.#renderSections('');
  }

  // ─── Rendu interne ────────────────────────────────────────────────

  #renderSections(filter) {
    const { _editions: editions, _lang: lang, _userPos: userPos,
            _currentId: currentId, _hexToRgb: hexToRgb } = this;
    if (!editions) return;

    const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                             .replace(/[-_]/g, ' ').toLowerCase();
    const query  = normalize(filter.trim());
    const today  = Time.todayStr();
    const cats   = [
      { key: 'large',  label: I18n.t('section_large')  },
      { key: 'medium', label: I18n.t('section_medium') },
      { key: 'small',  label: I18n.t('section_small')  },
    ];

    const container = this.querySelector('#feria-sections');
    container.innerHTML = '';

    for (const cat of cats) {
      const list = editions
        .filter(f => {
          if (f.category !== cat.key) return false;
          if (!query) return true;
          const name = normalize(Utils.loc(f.name, lang));
          const town = normalize(Utils.loc(f.town ?? f.name, lang));
          return name.includes(query) || town.includes(query);
        })
        .sort((a, b) => {
          const aOver = today > (a.dates?.end ?? '');
          const bOver = today > (b.dates?.end ?? '');
          if (aOver !== bOver) return aOver ? 1 : -1;
          if (userPos) {
            const da = Utils.haversine(userPos.lat, userPos.lng, a.center.lat, a.center.lng);
            const db = Utils.haversine(userPos.lat, userPos.lng, b.center.lat, b.center.lng);
            return da - db;
          }
          return (a.dates?.start ?? '').localeCompare(b.dates?.start ?? '');
        });

      if (!list.length) continue;

      const section = document.createElement('div');
      section.className = 'fp-section';
      section.innerHTML = `<div class="fp-section-title">${cat.label}</div>`;

      const scroll = document.createElement('div');
      scroll.className = 'fp-scroll';

      for (const f of list) {
        const isActive  = today >= (f.dates?.start ?? '') && today <= (f.dates?.end ?? '');
        const isPast    = today > (f.dates?.end ?? '');
        const isCurrent = f.id === currentId;
        const pc = f.theme?.primary   ?? '#666';
        const sc = f.theme?.secondary ?? '#fff';
        const { r: pr, g: pg, b: pb } = hexToRgb(pc);
        const { r: sr, g: sg, b: sb } = hexToRgb(sc);
        const grad = `linear-gradient(145deg,rgba(${pr},${pg},${pb},0.22) 0%,rgba(${sr},${sg},${sb},0.06) 100%)`;

        const startD = new Date((f.dates?.start ?? '2000-01-01') + 'T12:00:00');
        const endD   = new Date((f.dates?.end   ?? '2000-01-01') + 'T12:00:00');
        const fmt    = d => d.toLocaleDateString(I18n.locale(lang), { day: 'numeric', month: 'short' });
        const dates  = `${fmt(startD)} – ${fmt(endD)}`;

        let distLabel = '';
        if (userPos && f.center) {
          const d = Utils.haversine(userPos.lat, userPos.lng, f.center.lat, f.center.lng);
          distLabel = `<span class="fp-card-dist">${Utils.formatDistance(d)}</span>`;
        }

        const badgeCls  = isActive ? 'fp-badge-active' : isPast ? 'fp-badge-done' : 'fp-badge-soon';
        const badgeTxt  = isActive ? I18n.t('status_active') : isPast ? I18n.t('status_past') : I18n.t('status_upcoming');

        const card = document.createElement('button');
        card.className = `fp-card${isCurrent ? ' fp-card-active' : ''}`;
        card.dataset.id  = f.id;
        card.dataset.cat = cat.key;
        card.style.cssText = `--card-gradient:${grad};--card-p:${pc};--card-s:${sc}`;
        card.innerHTML = `
          <div class="fp-card-town">${Utils.escHtml(Utils.loc(f.name, lang))}</div>
          <div class="fp-card-dates">${dates}</div>
          ${distLabel}
          <span class="fp-badge ${badgeCls}">${badgeTxt}</span>`;

        card.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('inguru:feria-select', {
            bubbles: true, detail: { id: f.id }
          }));
        });

        scroll.appendChild(card);
      }

      section.appendChild(scroll);
      container.appendChild(section);
    }
  }
}

customElements.define('inguru-feria-panel', InguruFeriaPanel);
