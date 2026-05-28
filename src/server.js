// src/server.js
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import csrf from 'csurf';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

import authRoutes from './routes/auth.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import studentsRoutes from './routes/students.routes.js';
import pageRoutes from './routes/page.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(join(__dirname, 'public')));

// ── Sessions ──────────────────────────────────────────────────────────────────
// Sessions are stored server-side. The browser only gets a signed session ID
// cookie — no user data is stored client-side.
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    console.warn('[session] SESSION_SECRET not set — using insecure default');
    return 'insecure-default-change-me';
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,               // JS cannot read the cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
    sameSite: 'lax',
  },
}));

// ── CSRF protection ───────────────────────────────────────────────────────────
// Applies to all POST/PUT/DELETE requests. Every form must include a hidden
// _csrf field populated from req.csrfToken().
const csrfProtection = csrf();
app.use(csrfProtection);

// Handle CSRF errors gracefully
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).send('Invalid or expired form submission. Please go back and try again.');
  }
  next(err);
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(authRoutes);
app.use(attendanceRoutes);
app.use(studentsRoutes);
app.use(pageRoutes);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
