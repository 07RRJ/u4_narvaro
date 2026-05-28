// src/middleware/auth.js
// Verifies that an active session exists AND that the stored teacher ID
// matches a real teacher/admin row in the profiles table.

import { supabase } from '../lib/supabase.js';

export async function requireTeacher(req, res, next) {
  const teacher = req.session?.teacher;

  if (!teacher?.id) {
    return res.redirect('/login');
  }

  // Re-validate against the database on every protected request.
  // This ensures revoked/deleted accounts are blocked immediately.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacher.id)
    .single();

  if (error || !profile || !['teacher', 'admin'].includes(profile.role)) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

  // Attach fresh role to req so routes can use it
  req.teacher = { id: teacher.id, email: teacher.email, role: profile.role };
  next();
}
