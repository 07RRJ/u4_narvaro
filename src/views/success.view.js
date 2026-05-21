import { layout } from './layout.js';
import { escapeHtml } from '../utils/html.js';

export function successView(name, message) {
  return layout('Mottaget', `
  <h1>✅ Jag tog emot din input</h1>
  <p class="hint">Input är opålitlig → vi validerar, begränsar längd och escape:ar innan visning.</p>

  <div class="card">
    <p><strong>Namn:</strong> ${escapeHtml(name)}</p>
    <p><strong>Meddelande:</strong><br/>${escapeHtml(message).replaceAll('\n', '<br/>')}</p>
  </div>

  <p><a href="/">Skicka ett till</a> · <a href="/messages">Se listan</a></p>`);
}
