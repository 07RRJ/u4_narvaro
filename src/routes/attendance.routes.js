// src/routes/attendance.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireTeacher } from '../middleware/auth.js';
import { teacherTemplate } from '../utils/html.js';
import { getWeekDates, weekLabel } from '../utils/date.js';
import { renderWeekNav, renderViewTable, renderEditTable } from '../utils/attendance.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseWeekOffset(query) {
  const n = parseInt(query.week ?? '0', 10);
  return isNaN(n) ? 0 : n;
}

async function fetchWeekData(weekDates) {
  const [{ data: students }, { data: dbSessions }] = await Promise.all([
    supabase.from('students').select('id, full_name').order('full_name'),
    supabase
      .from('attendance_sessions')
      .select('id, session_date')
      .in('session_date', weekDates)
      .order('session_date'),
  ]);

  // Always return all 5 weekdays — fill missing days with id: null placeholders
  const sessionMap = Object.fromEntries((dbSessions ?? []).map((s) => [s.session_date, s]));
  const sessions = weekDates.map((date) => sessionMap[date] ?? { id: null, session_date: date });

  let records = [];
  const realIds = sessions.filter((s) => s.id).map((s) => s.id);
  if (realIds.length) {
    const { data } = await supabase
      .from('attendance_records')
      .select('session_id, student_id, present')
      .in('session_id', realIds);
    records = data ?? [];
  }

  return { students: students ?? [], sessions, records };
}

// ── GET /attendance — view mode ───────────────────────────────────────────────

router.get('/attendance', requireTeacher, async (req, res) => {
  const offset = parseWeekOffset(req.query);
  const weekDates = getWeekDates(offset);
  const { students, sessions, records } = await fetchWeekData(weekDates);

  const nav = renderWeekNav({
    offset,
    basePath: '/attendance',
    csrfToken: req.csrfToken(),
    isTeacher: true,
  });

  const table = renderViewTable({ students, sessions, records });

  res.send(teacherTemplate('Calendar', `
    <div class="page-header">
      <h1>Attendance</h1>
      <a href="/attendance/edit?week=${offset}" class="btn btn-primary">Edit attendance</a>
    </div>
    ${nav}
    ${table}
  `, req.csrfToken()));
});

// ── GET /attendance/edit — edit mode ──────────────────────────────────────────

router.get('/attendance/edit', requireTeacher, async (req, res) => {
  const offset = parseWeekOffset(req.query);
  const weekDates = getWeekDates(offset);
  const { students, sessions, records } = await fetchWeekData(weekDates);

  const nav = renderWeekNav({
    offset,
    basePath: '/attendance/edit',
    csrfToken: req.csrfToken(),
    isTeacher: true,
  });

  const table = renderEditTable({ students, sessions, records, offset, csrfToken: req.csrfToken() });

  res.send(teacherTemplate('Edit attendance', `
    <div class="page-header">
      <h1>Edit attendance</h1>
    </div>
    ${nav}
    ${table}
  `, req.csrfToken()));
});

// ── POST /attendance/save — save the full week ────────────────────────────────
// The form sends present[studentId][date] = "1" for every checked box.
// Unchecked boxes are absent by omission.
// We upsert all records for the week, overwriting whatever was there before.

router.post('/attendance/save', requireTeacher, async (req, res) => {
  const offset = parseWeekOffset(req.query);
  const weekDates = getWeekDates(offset);
  const teacherId = req.teacher.id;

  // Parse the nested form data: { studentId: { date: "1" } }
  const presentMap = req.body.present ?? {};

  // 1. Ensure a session row exists for every non-future weekday
  const today = new Date().toISOString().split('T')[0];
  const editableDates = weekDates.filter((d) => d <= today);

  // Upsert sessions for editable days
  const sessionUpserts = editableDates.map((date) => ({
    session_date: date,
    created_by: teacherId,
  }));

  const { data: sessions, error: sessionError } = await supabase
    .from('attendance_sessions')
    .upsert(sessionUpserts, { onConflict: 'session_date' })
    .select('id, session_date');

  if (sessionError) {
    console.error('[attendance/save] session upsert error:', sessionError);
    return res.redirect(`/attendance/edit?week=${offset}`);
  }

  const sessionByDate = Object.fromEntries(sessions.map((s) => [s.session_date, s.id]));

  // 2. Fetch all students to know which IDs are valid
  const { data: students } = await supabase
    .from('students')
    .select('id');

  const studentIds = new Set((students ?? []).map((s) => String(s.id)));

  // 3. Build the full upsert payload for all students × editable days
  const records = [];
  for (const date of editableDates) {
    const sessionId = sessionByDate[date];
    if (!sessionId) continue;

    for (const studentId of studentIds) {
      const present = presentMap[studentId]?.[date] === '1';
      records.push({
        session_id: sessionId,
        student_id: parseInt(studentId, 10),
        present,
        marked_by: teacherId,
        marked_at: new Date().toISOString(),
      });
    }
  }

  if (records.length) {
    const { error: recordError } = await supabase
      .from('attendance_records')
      .upsert(records, { onConflict: 'session_id,student_id' });

    if (recordError) {
      console.error('[attendance/save] record upsert error:', recordError);
    }
  }

  res.redirect(`/attendance?week=${offset}`);
});

export default router;
