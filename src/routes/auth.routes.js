// src/routes/auth.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { escape, publicTemplate } from '../utils/html.js';

const router = Router();

// ── GET /login ────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session?.teacher) return res.redirect('/attendance');

  const errorMsg = req.session.loginError ?? null;
  delete req.session.loginError;

  res.send(publicTemplate('Login', `
    <div class="auth-wrap">
      <div class="auth-box">
        <h1>Teacher login</h1>
        ${errorMsg ? `<div class="alert alert-error">${escape(errorMsg)}</div>` : ''}
        <form method="POST" action="/auth/login">
          <input type="hidden" name="_csrf" value="${escape(req.csrfToken())}"/>
          <label>
            Email
            <input type="email" name="email" required autofocus placeholder="teacher@school.se"/>
          </label>
          <label>
            Password
            <input type="password" name="password" required placeholder="••••••••"/>
          </label>
          <button type="submit" class="btn btn-primary btn-full">Sign in</button>
        </form>
      </div>
    </div>
  `));
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.session.loginError = 'Email and password are required.';
    return res.redirect('/login');
  }

  // Authenticate via Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    req.session.loginError = 'Incorrect email or password.';
    return res.redirect('/login');
  }

  // Check the user has a teacher/admin profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (!profile || !['teacher', 'admin'].includes(profile.role)) {
    req.session.loginError = 'Your account does not have teacher access.';
    return res.redirect('/login');
  }

  // Store minimal info in the session — role is re-verified on each request
  req.session.teacher = {
    id: data.user.id,
    email: data.user.email,
  };

  res.redirect('/attendance');
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

export default router;
