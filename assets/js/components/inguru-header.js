/**
 * <inguru-header>
 * Barre de navigation : logo Shrikhand + bouton festival + sélecteur de langue.
 *
 * CustomEvents émis :
 *   inguru:festival-panel-toggle  — demande l'ouverture/fermeture du panneau
 *   inguru:lang-change { lang }  — changement de langue sélectionné
 *
 * Méthodes :
 *   setFestival(name)   — met à jour le nom affiché
 *   setPanelOpen(bool)  — met à jour l'état visuel du bouton festival
 *   closeLangMenu()     — ferme le dropdown langue
 */
class InguruHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header id="header">
        <div class="header-left">
          <span class="logo">inguru</span>
          <button id="festival-btn" aria-haspopup="true" aria-expanded="false">
            <span class="festival-btn-name" id="festival-btn-name">Chargement…</span>
            <span class="festival-btn-arrow" aria-hidden="true">▾</span>
          </button>
        </div>
        <div class="header-right">
          <div class="lang-wrapper">
            <button id="lang-btn" class="icon-btn" aria-label="Langue" aria-haspopup="true">🌐</button>
            <div id="lang-menu" class="lang-menu hidden" role="menu">
              <button data-lang="fr" role="menuitem">Français</button>
              <button data-lang="es" role="menuitem">Español</button>
              <button data-lang="eu" role="menuitem">Euskara</button>
            </div>
          </div>
        </div>
      </header>`;

    this._setupFestivalBtn();
    this._setupLangMenu();
  }

  // ─── Méthodes publiques ───────────────────────────────────────────

  setFestival(name) {
    const el = this.querySelector('#festival-btn-name');
    if (el) el.textContent = name;
  }

  setLang(lang) {
    this.querySelectorAll('#lang-menu button[data-lang]').forEach(b => {
      b.classList.toggle('lang-active', b.dataset.lang === lang);
    });
  }

  setPanelOpen(open) {
    const btn = this.querySelector('#festival-btn');
    if (!btn) return;
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  }

  closeLangMenu() {
    this.querySelector('#lang-menu')?.classList.add('hidden');
  }

  // ─── Setup interne ────────────────────────────────────────────────

  _setupFestivalBtn() {
    this.querySelector('#festival-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('inguru:festival-panel-toggle', { bubbles: true }));
    });
  }

  _setupLangMenu() {
    const btn  = this.querySelector('#lang-btn');
    const menu = this.querySelector('#lang-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = menu.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', !isHidden);
    });

    // Ferme si clic hors du composant
    document.addEventListener('click', () => this.closeLangMenu());

    menu.querySelectorAll('button[data-lang]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeLangMenu();
        this.dispatchEvent(new CustomEvent('inguru:lang-change', {
          bubbles: true,
          detail: { lang: e.currentTarget.dataset.lang }
        }));
      });
    });
  }
}

customElements.define('inguru-header', InguruHeader);
