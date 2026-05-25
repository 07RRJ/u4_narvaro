// src/controllers/request.controller.js
import { supabase } from '../lib/supabase.js';
import { clampString } from '../utils/sanitize.js';
import { formView } from '../views/form.view.js';
import { successView } from '../views/success.view.js';
import { messagesView } from '../views/messages.view.js';
import { editView } from '../views/edit.view.js';






export async function deleteMessage(req, res) {
  const { id } = req.params;

  const { error } = await supabase
    .from('request_messages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[supabase] delete error:', error);
    return res
      .status(500)
      .type('html')
      .send('<p>Serverfel vid borttagning.</p><p><a href="/messages">Tillbaka</a></p>');
  }

  res.redirect('/messages');
}
