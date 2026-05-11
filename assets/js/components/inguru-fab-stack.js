/**
 * <inguru-fab-stack>
 * Bouton menu flottant bas-droite + bouton partage de position.
 *
 * CustomEvents émis :
 *   inguru:menu-toggle     — bouton menu pressé
 *   inguru:share-location  — bouton partage position pressé
 *
 * Méthodes :
 *   setMenuOpen(bool)   — bascule icône hamburger / croix
 *   setActive(bool)     — pulse quand la géoloc est active
 *   setLocating(bool)   — spinner pendant la géoloc
 *   showShareBtn(bool)  — affiche/masque le bouton de partage
 *   showLocateBtn(bool) — affiche/masque le bouton menu (compat Features)
 */

const _SVG_MENU = `<svg width="22" height="16" viewBox="0 0 22 16" fill="currentColor" aria-hidden="true">
  <rect x="0" y="0"  width="22" height="2.2" rx="1.1"/>
  <rect x="0" y="6.9" width="22" height="2.2" rx="1.1"/>
  <rect x="0" y="13.8" width="22" height="2.2" rx="1.1"/>
</svg>`;

const _SVG_CLOSE = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
  <line x1="1.5" y1="1.5" x2="16.5" y2="16.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <line x1="16.5" y1="1.5" x2="1.5" y2="16.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

class InguruFabStack extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="fab-stack">
        <button id="fab-share-loc" class="fab fab-share-loc hidden"
          aria-label="${I18n.t('share_location')}">📤</button>
        <button id="fab-menu" class="fab fab-locate"
          aria-label="Menu">${_SVG_MENU}</button>
      </div>`;

    this.querySelector('#fab-menu')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('inguru:menu-toggle', { bubbles: true }));
    });

    this.querySelector('#fab-share-loc')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('inguru:share-location', { bubbles: true }));
    });
  }

  setMenuOpen(open) {
    const btn = this.querySelector('#fab-menu');
    if (!btn) return;
    btn.innerHTML = open ? _SVG_CLOSE : _SVG_MENU;
    btn.classList.toggle('is-open', open);
  }

  setActive(active) {
    this.querySelector('#fab-menu')?.classList.toggle('active', active);
  }

  setLocating(loading) {
    const btn = this.querySelector('#fab-menu');
    if (!btn) return;
    btn.innerHTML = loading ? '⏳' : (btn.classList.contains('is-open') ? _SVG_CLOSE : _SVG_MENU);
  }

  showShareBtn(visible) {
    this.querySelector('#fab-share-loc')?.classList.toggle('hidden', !visible);
  }

  showLocateBtn(visible) {
    this.querySelector('#fab-menu')?.classList.toggle('hidden', !visible);
  }
}

customElements.define('inguru-fab-stack', InguruFabStack);
