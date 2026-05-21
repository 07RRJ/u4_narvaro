import { layout } from './layout.js';
import { escapeHtml } from '../utils/html.js';

export function messagesView(rows) {
  const items = rows
    .map(row => {
      const when = new Date(row.created_at).toLocaleString('sv-SE');
      return `<li>
        <div><strong>#${row.id}</strong> · ${escapeHtml(when)}</div>
        <div><strong>${escapeHtml(row.name)}</strong></div>
        <div>${escapeHtml(row.message).replaceAll('\n', '<br/>')}</div>
        <div class="row-actions">
          <a href="/messages/${row.id}/edit"><button class="secondary" type="button">✏️ Redigera</button></a>
          <form method="POST" action="/messages/${row.id}/delete" style="display:inline" onsubmit="return confirm('Ta bort detta inlägg?')">
            <button class="danger" type="submit">🗑 Ta bort</button>
          </form>
        </div>
      </li>`;
    })
    .join('');

  return layout('Senaste meddelanden', `
  <h1>Senaste requests</h1>
  <a href="/">← Till formuläret</a>
  <ul>${items || '<li>Inga meddelanden än.</li>'}</ul>`);
}
