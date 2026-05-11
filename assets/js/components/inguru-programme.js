/**
 * <inguru-programme>
 * Vue liste chronologique de tous les events de l'édition courante.
 * Lit directement Events.events / Events.venues (modules globaux).
 *
 * Méthodes :
 *   render(lang)  — génère le HTML depuis Events
 *   show()
 *   hide()
 */
class InguruProgramme extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="prog-panel hidden">
        <div class="prog-scroll" id="prog-scroll"></div>
      </div>`;
  }

  render(lang) {
    const events = [...(Events.events ?? [])].sort(
      (a, b) => new Date(a.startTimestamp) - new Date(b.startTimestamp)
    );

    const scroll = this.querySelector('#prog-scroll');

    if (!events.length) {
      scroll.innerHTML = `<div class="prog-empty">${I18n.t('no_event')}</div>`;
      return;
    }

    // Groupe par jour (date de début)
    const groups = new Map();
    for (const ev of events) {
      const day = Time.dateStr(ev.startTimestamp);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(ev);
    }

    let html = '';
    for (const [, dayEvents] of groups) {
      const d = new Date(dayEvents[0].startTimestamp);
      const dayLabel = d.toLocaleDateString(I18n.locale(lang), {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      html += `<div class="prog-day-header">${dayLabel}</div>`;

      for (const ev of dayEvents) {
        const venue     = Events.venue(ev.venueId);
        const venueName = venue ? Utils.escHtml(Utils.loc(venue.name, lang)) : '';
        const title     = Utils.escHtml(Utils.loc(ev.title ?? ev.shortName, lang));
        const startTime = Time.timeStr(ev.startTimestamp);
        const endTime   = ev.endTimestamp ? Time.timeStr(ev.endTimestamp) : '';
        const timeLabel = endTime ? `${startTime}–${endTime}` : startTime;

        const st = Time.status(ev);
        let rowMod  = 'm-later';
        let badgeHtml = `<span class="badge badge-next">${I18n.t('status_next')}</span>`;
        if (st === 'now') {
          rowMod    = 'm-now';
          badgeHtml = `<span class="badge badge-now">${I18n.t('status_now')}</span>`;
        } else if (st === 'done') {
          rowMod    = 'm-done';
          badgeHtml = `<span class="badge badge-done">${I18n.t('status_done')}</span>`;
        }

        html += `
          <div class="prog-row ${rowMod}" role="button" tabindex="0" data-venue-id="${ev.venueId ?? ''}">
            <div class="prog-time">${timeLabel}</div>
            <div class="prog-body">
              <div class="prog-title">${title}</div>
              ${venueName ? `<div class="prog-venue">${venueName}</div>` : ''}
            </div>
            ${badgeHtml}
          </div>`;
      }
    }

    scroll.innerHTML = html;

    scroll.querySelectorAll('.prog-row[data-venue-id]').forEach(row => {
      if (!row.dataset.venueId) return;
      row.addEventListener('click', () => App.showPopup(row.dataset.venueId));
    });
  }

  show() {
    this.querySelector('.prog-panel')?.classList.remove('hidden');
  }

  hide() {
    this.querySelector('.prog-panel')?.classList.add('hidden');
  }
}

customElements.define('inguru-programme', InguruProgramme);
