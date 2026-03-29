/**
 * <inguru-fab-stack>
 * Boutons flottants empilés bas-droite : localisation + partage de position.
 *
 * CustomEvents émis :
 *   inguru:locate        — bouton localisation pressé
 *   inguru:share-location — bouton partage position pressé
 *
 * Méthodes :
 *   setLocating(bool)     — spinner / icône normale
 *   setActive(bool)       — pulse quand la géoloc est active
 *   showShareBtn(bool)    — affiche/masque le bouton de partage
 */
class InguruFabStack extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="fab-stack">
        <button id="fab-share-loc" class="fab fab-share-loc hidden"
          aria-label="${I18n.t('share_location')}">📤</button>
        <button id="fab-locate" class="fab fab-locate"
          aria-label="${I18n.t('locate_enable')}">📍</button>
      </div>`;

    this.querySelector('#fab-locate')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('inguru:locate', { bubbles: true }));
    });

    this.querySelector('#fab-share-loc')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('inguru:share-location', { bubbles: true }));
    });
  }

  setLocating(loading) {
    const btn = this.querySelector('#fab-locate');
    if (btn) btn.textContent = loading ? '⏳' : '📍';
  }

  setActive(active) {
    this.querySelector('#fab-locate')?.classList.toggle('active', active);
  }

  showShareBtn(visible) {
    this.querySelector('#fab-share-loc')?.classList.toggle('hidden', !visible);
  }
}

customElements.define('inguru-fab-stack', InguruFabStack);
