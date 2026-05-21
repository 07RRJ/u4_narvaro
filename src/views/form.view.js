import { layout } from './layout.js';

export function formView() {
  return layout('Request-resan', `
  <h1>Request-resan (GET → POST → DB)</h1>

  <form method="POST" action="/send">
    <label>
      Namn
      <input name="name" autocomplete="name" maxlength="50" required />
    </label>

    <label>
      Meddelande
      <textarea name="message" rows="4" maxlength="500" required></textarea>
    </label>

    <button type="submit">Skicka (POST /send)</button>
  </form>

  <div class="links">
    <a href="/messages">Se senaste meddelanden (GET /messages)</a>
  </div>`);
}
