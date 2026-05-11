/**
 * <inguru-view-menu>
 * Overlay plein écran blur + 2 choix de vue + sélecteur de langue en bas.
 *
 * CustomEvents émis :
 *   inguru:view-change { view: 'map' | 'programme' }
 *   inguru:locate
 *   inguru:lang-change { lang }
 *   inguru:menu-close
 *
 * Méthodes :
 *   open()
 *   close()
 *   setActiveView(view)
 *   setLang(lang)
 */
class InguruViewMenu extends HTMLElement {
  #open = false;

  connectedCallback() {
    this._build();
  }

  _build() {
    const lang = I18n.lang;
    this.innerHTML = `
      <div class="vm-overlay">
        <div class="vm-backdrop"></div>

        <div class="vm-choices">
          <button class="vm-choice vm-view" data-action="map">${I18n.t('view_map')}</button>
          <button class="vm-choice vm-view" data-action="programme">${I18n.t('view_programme')}</button>
          <div class="vm-lang-block" role="group" aria-label="Langue">
            <button class="vm-lang-btn${lang==='fr'?' lang-active':''}" data-lang="fr">Français</button>
            <button class="vm-lang-btn${lang==='es'?' lang-active':''}" data-lang="es">Español</button>
            <button class="vm-lang-btn${lang==='eu'?' lang-active':''}" data-lang="eu">Euskara</button>
          </div>
        </div>
      </div>`;

    this.querySelector('.vm-backdrop')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('inguru:menu-close', { bubbles: true }));
    });

    this.querySelectorAll('.vm-view').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('inguru:view-change', {
          bubbles: true,
          detail: { view: btn.dataset.action },
        }));
        if (btn.dataset.action === 'map') {
          this.dispatchEvent(new CustomEvent('inguru:locate', { bubbles: true }));
        }
        this.dispatchEvent(new CustomEvent('inguru:menu-close', { bubbles: true }));
      });
    });

    this.querySelectorAll('.vm-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('inguru:lang-change', {
          bubbles: true,
          detail: { lang: btn.dataset.lang },
        }));
        this.dispatchEvent(new CustomEvent('inguru:menu-close', { bubbles: true }));
      });
    });
  }

  open() {
    this.#open = true;
    const overlay = this.querySelector('.vm-overlay');
    if (!overlay) return;
    overlay.classList.remove('closing');
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  close() {
    this.#open = false;
    const overlay = this.querySelector('.vm-overlay');
    if (!overlay) return;
    overlay.classList.add('closing');
    overlay.classList.remove('visible');
    setTimeout(() => {
      if (!this.#open) overlay.classList.remove('closing');
    }, 380);
  }

  setActiveView(view) {
    this.querySelectorAll('.vm-view').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.action === view);
    });
  }

  setLang(lang) {
    const mapBtn  = this.querySelector('[data-action="map"]');
    const progBtn = this.querySelector('[data-action="programme"]');
    if (mapBtn)  mapBtn.textContent  = I18n.t('view_map');
    if (progBtn) progBtn.textContent = I18n.t('view_programme');
    this.querySelectorAll('.vm-lang-btn').forEach(b => {
      b.classList.toggle('lang-active', b.dataset.lang === lang);
    });
  }
}

customElements.define('inguru-view-menu', InguruViewMenu);
