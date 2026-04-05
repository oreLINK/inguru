/**
 * share-template.js – Messages "Prévenir mes potes"
 *
 * Personnalisez les templates ici. Les fonctions reçoivent un objet avec
 * toutes les variables disponibles au moment du partage :
 *
 *   venueName  — nom du lieu (ex: "Esplanade Roland-Barthes")
 *   feriaName  — nom de la feria (ex: "Foire au Jambon")
 *   time       — heure de début (ex: "21h00")
 *   date       — date de l'événement (ex: "jeudi 24 avril")
 *   url        — lien de navigation vers le lieu
 *   lang       — langue active ("fr" | "es" | "eu")
 */
const ShareMessage = {

  // ─── Avec un événement en cours / à venir ────────────────────────────────
  withEvent: {
    fr: ({ venueName, time, url }) =>
      `Je serai à ${venueName} à ${time} — rejoins-moi\u00a0! ${url}`,
    es: ({ venueName, time, url }) =>
      `Estaré en ${venueName} a las ${time} — ¡únete! ${url}`,
    eu: ({ venueName, time, url }) =>
      `${venueName} tokian ${time}etan izango naiz — etorri! ${url}`,
  },

  // ─── Sans événement (lieu seul) ──────────────────────────────────────────
  withoutEvent: {
    fr: ({ venueName, url }) =>
      `Je suis à ${venueName} — rejoins-moi\u00a0! ${url}`,
    es: ({ venueName, url }) =>
      `Estoy en ${venueName} — ¡únete! ${url}`,
    eu: ({ venueName, url }) =>
      `${venueName} tokian nago — etorri! ${url}`,
  },

  // ─── Build ───────────────────────────────────────────────────────────────
  build(context) {
    const group = context.hasEvent ? this.withEvent : this.withoutEvent;
    const fn = group[context.lang] ?? group['fr'];
    return fn(context);
  },
};
