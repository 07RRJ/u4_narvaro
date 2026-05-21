import { layout } from './layout.js';
import { escapeHtml } from '../utils/html.js';

export function editView(row) {
  return layout('Redigera inlägg', `
  <h1>✏️ Redigera inlägg #${row.id}</h1>

  <form method="POST" action="/messages/${row.id}/edit">
    <label>
      Namn
      <input name="name" maxlength="50" required value="${escapeHtml(row.name)}" />
    </label>

    <label>
      Meddelande
      <textarea name="message" rows="6" maxlength="500" required>${escapeHtml(row.message)}</textarea>
    </label>

    <button type="submit">Spara ändringar</button>
    <a href="/messages"><button class="secondary" type="button">Avbryt</button></a>
  </form>`);
}
