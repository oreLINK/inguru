/**
 * <inguru-header>
 * Barre de navigation : logo + bouton feria.
 * Le sélecteur de langue a été déplacé dans inguru-view-menu.
 *
 * CustomEvents émis :
 *   inguru:feria-panel-toggle  — demande l'ouverture/fermeture du panneau
 *
 * Méthodes :
 *   setFeria(name)      — met à jour le nom affiché
 *   setPanelOpen(bool)  — met à jour l'état visuel du bouton feria
 *   setLang()           — no-op (compat app.js)
 *   closeLangMenu()     — no-op (compat app.js)
 */
class InguruHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header id="header">
        <span class="logo">inguru</span>
        <button id="feria-btn" aria-haspopup="true" aria-expanded="false">
          <span class="feria-btn-name" id="feria-btn-name">Chargement…</span>
          <span class="feria-btn-arrow" aria-hidden="true">▾</span>
        </button>
      </header>`;

    this.querySelector('#feria-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('inguru:feria-panel-toggle', { bubbles: true }));
    });
  }

  setFeria(name) {
    const el = this.querySelector('#feria-btn-name');
    if (el) el.textContent = name;
  }

  setPanelOpen(open) {
    const btn = this.querySelector('#feria-btn');
    if (!btn) return;
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  }

  setLang()      {}
  closeLangMenu() {}
}

customElements.define('inguru-header', InguruHeader);
