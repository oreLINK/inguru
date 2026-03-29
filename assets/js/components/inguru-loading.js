/**
 * <inguru-loading>
 * Écran de chargement et écran d'erreur.
 *
 * Méthodes :
 *   setStep(msg)   — met à jour le texte d'étape
 *   hide()         — masque le loader
 *   showError(msg) — bascule vers l'écran d'erreur
 */
class InguruLoading extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="loading" id="loading-overlay">
        <div class="loading-logo">inguru</div>
        <div class="loading-inner">
          <div class="spinner"></div>
          <p class="loading-step">Chargement…</p>
        </div>
      </div>
      <div class="error-screen hidden" id="error-overlay">
        <span class="error-icon">⚠️</span>
        <p class="error-text">Erreur de chargement</p>
        <button class="btn btn-primary" style="max-width:200px"
          onclick="location.reload()">Réessayer</button>
      </div>`;
  }

  setStep(msg) {
    const el = this.querySelector('.loading-step');
    if (el) el.textContent = msg;
    console.log('[Inguru]', msg);
  }

  hide() {
    const el = this.querySelector('#loading-overlay');
    if (el) el.classList.add('hidden');
  }

  showError(msg) {
    this.hide();
    const overlay = this.querySelector('#error-overlay');
    const text    = this.querySelector('.error-text');
    if (text)    text.textContent = msg;
    if (overlay) overlay.classList.remove('hidden');
  }
}

customElements.define('inguru-loading', InguruLoading);
