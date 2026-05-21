// src/controllers/request.controller.js
import { supabase } from '../lib/supabase.js';
import { clampString } from '../utils/sanitize.js';
import { formView } from '../views/form.view.js';
import { successView } from '../views/success.view.js';
import { messagesView } from '../views/messages.view.js';
import { editView } from '../views/edit.view.js';

export function showForm(req, res) {
  res.type('html').send(formView());
}

export async function sendMessage(req, res) {
  const name = clampString(req.body?.name, 50);
  const message = clampString(req.body?.message, 500);

  if (!name || !message) {
    return res
      .status(400)
      .type('html')
      .send('<p>Fel: saknar namn eller meddelande.</p><p><a href="/">Tillbaka</a></p>');
  }

  const userAgent = clampString(req.get('user-agent'), 200);
  const ip = clampString(req.ip, 60);

  const { error } = await supabase
    .from('request_messages')
    .insert([{ name, message, user_agent: userAgent, ip }]);

  if (error) {
    console.error('[supabase] insert error:', error);
    return res
      .status(500)
      .type('html')
      .send('<p>Serverfel när vi skulle spara i databasen.</p><p><a href="/">Tillbaka</a></p>');
  }

  res.type('html').send(successView(name, message));
}

export async function listMessages(req, res) {
  const { data, error } = await supabase
    .from('request_messages')
    .select('id, created_at, name, message')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[supabase] select error:', error);
    return res
      .status(500)
      .type('html')
      .send('<p>Serverfel när vi skulle läsa från databasen.</p><p><a href="/">Tillbaka</a></p>');
  }

  res.type('html').send(messagesView(data || []));
}

export async function showEditForm(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('request_messages')
    .select('id, name, message')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res
      .status(404)
      .type('html')
      .send('<p>Inlägg hittades inte.</p><p><a href="/messages">Tillbaka</a></p>');
  }

  res.type('html').send(editView(data));
}

export async function updateMessage(req, res) {
  const { id } = req.params;
  const name = clampString(req.body?.name, 50);
  const message = clampString(req.body?.message, 500);

  if (!name || !message) {
    return res
      .status(400)
      .type('html')
      .send('<p>Fel: saknar namn eller meddelande.</p><p><a href="/messages">Tillbaka</a></p>');
  }

  const { error } = await supabase
    .from('request_messages')
    .update({ name, message })
    .eq('id', id);

  if (error) {
    console.error('[supabase] update error:', error);
    return res
      .status(500)
      .type('html')
      .send('<p>Serverfel vid uppdatering.</p><p><a href="/messages">Tillbaka</a></p>');
  }

  res.redirect('/messages');
}

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
