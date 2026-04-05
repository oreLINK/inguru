/**
 * features.js – Résolution des feature flags
 *
 * Priorité : feria > global. Retourne true si non configuré.
 * L'ID feria est déduit de l'édition en retirant le suffixe année
 * (ex: bayonne-foire-jambon-2026 → bayonne-foire-jambon).
 *
 * Usage :
 *   Features.get('events', editionId)
 *   Features.get('eventPopup.enabled', editionId)
 *   Features.get('eventPopup.fields.place', editionId)
 */
const Features = {
  _config: null,

  load(config) {
    this._config = config;
  },

  _feriaKey(editionId) {
    return editionId ? editionId.replace(/-\d{4}$/, '') : null;
  },

  /**
   * Résout un flag pour une édition donnée.
   * @param {string} path      Chemin dot-notation (ex: 'eventPopup.fields.place')
   * @param {string} editionId ID de l'édition courante (peut être null)
   * @returns {boolean}
   */
  get(path, editionId) {
    if (!this._config) return true;
    const keys = path.split('.');
    const resolve = (obj) =>
      obj == null
        ? undefined
        : keys.reduce((o, k) => (o != null && typeof o === 'object' ? o[k] : undefined), obj);

    const globalVal = resolve(this._config.global);

    // global === false → bloque toutes les férias sans exception
    if (globalVal === false) return false;

    // global === true ou null/absent → la feria a la main
    const feriaKey = this._feriaKey(editionId);
    if (feriaKey) {
      const feriaVal = resolve(this._config.ferias?.[feriaKey]);
      if (feriaVal !== undefined) return Boolean(feriaVal);
    }

    // Pas de valeur feria → true par défaut (global true ou null)
    return true;
  },
};
