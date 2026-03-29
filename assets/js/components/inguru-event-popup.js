/**
 * <inguru-event-popup>
 * Popup Liquid Glass affichant les détails d'un événement.
 *
 * CustomEvents émis :
 *   inguru:popup-close  — bouton ✕ pressé
 *
 * Méthodes :
 *   show(html)        — affiche la popup avec le contenu HTML fourni
 *   hide()            — masque la popup
 *   isVisible()       — retourne l'état courant
 *   setTheme(p, s)    — applique les couleurs du festival (hex strings)
 */
class InguruEventPopup extends HTMLElement {
  #visible = false;

  connectedCallback() {
    this.innerHTML = `
      <div id="event-popup" class="ev-popup hidden">
        <div class="ev-popup-inner">
          <button id="popup-close" class="ev-popup-close" aria-label="Fermer">✕</button>
          <div id="popup-content" class="ev-popup-content"></div>
        </div>
        <div class="ev-popup-arrow" id="popup-arrow"></div>
      </div>`;

    this.querySelector('#popup-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('inguru:popup-close', { bubbles: true }));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.#visible) {
        this.dispatchEvent(new CustomEvent('inguru:popup-close', { bubbles: true }));
      }
    });
  }

  // ─── Méthodes publiques ───────────────────────────────────────────

  isVisible() { return this.#visible; }

  show(html) {
    const popup   = this.querySelector('#event-popup');
    const content = this.querySelector('#popup-content');
    if (!popup || !content) return;
    content.innerHTML = html;
    if (this.#visible) return;   // déjà visible → on met juste le contenu à jour
    popup.classList.remove('hidden');
    this.#visible = true;
    requestAnimationFrame(() => popup.classList.add('visible'));
  }

  hide() {
    const popup = this.querySelector('#event-popup');
    if (!popup) return;
    popup.classList.remove('visible');
    popup.classList.add('hidden');
    this.#visible = false;
  }

  /**
   * Applique les couleurs du festival courant aux éléments internes.
   * p = primary hex, s = secondary hex
   */
  setTheme(p, s) {
    const popup = this.querySelector('#event-popup');
    if (!popup) return;
    popup.style.setProperty('--popup-p', p);
    popup.style.setProperty('--popup-s', s);
    // Calcule les variantes alpha
    const hex = h => parseInt(h.replace('#', ''), 16);
    const r = (hex(p) >> 16) & 255;
    const g = (hex(p) >> 8)  & 255;
    const b = hex(p)          & 255;
    popup.style.setProperty('--popup-p-a18', `rgba(${r},${g},${b},0.18)`);
    popup.style.setProperty('--popup-p-a35', `rgba(${r},${g},${b},0.35)`);
    popup.style.setProperty('--popup-p-a60', `rgba(${r},${g},${b},0.60)`);
  }
}

customElements.define('inguru-event-popup', InguruEventPopup);
