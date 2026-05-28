// src/utils/html.js
// Single source of truth for page templates and HTML helpers.

export function escape(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ── Authenticated layout (shows nav + logout) ─────────────────────────────

export function teacherTemplate(title, content, csrfToken) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escape(title)} – Attendance</title>
  <link rel="stylesheet" href="/css/style.css"/>
</head>
<body>
  <nav class="navbar">
    <div class="nav-left">
      <span class="nav-brand">Attendance</span>
      <a href="/attendance">Calendar</a>
      <a href="/students">Students</a>
    </div>
    <div class="nav-right">
      <form method="POST" action="/auth/logout">
        <input type="hidden" name="_csrf" value="${escape(csrfToken)}"/>
        <button type="submit" class="nav-logout">Log out</button>
      </form>
    </div>
  </nav>
  <main class="container">
    ${content}
  </main>
</body>
</html>`;
}

// ── Public layout (shows login link) ─────────────────────────────────────

export function publicTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escape(title)} – Attendance</title>
  <link rel="stylesheet" href="/css/style.css"/>
</head>
<body>
  <nav class="navbar">
    <div class="nav-left">
      <span class="nav-brand">Attendance</span>
      <a href="/">Overview</a>
    </div>
    <div class="nav-right">
      <a href="/login" class="nav-login">Teacher login</a>
    </div>
  </nav>
  <main class="container">
    ${content}
  </main>
</body>
</html>`;
}
