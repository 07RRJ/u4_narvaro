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

  const presentMap = req.body.present ?? {};

  // Only save non-future days
  // Use local date for today — toISOString() returns UTC which is wrong in UTC+ timezones
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const editableDates = weekDates.filter((d) => d <= today);

  if (!editableDates.length) {
    return res.redirect(`/attendance?week=${offset}`);
  }

  // 1. Ensure session rows exist for editable days.
  //    upsert with ignoreDuplicates:true → Postgres "INSERT ... ON CONFLICT DO NOTHING"
  //    Only needs INSERT policy — existing rows are left untouched.
  const { error: insertError } = await supabase
    .from('attendance_sessions')
    .upsert(
      editableDates.map((date) => ({ session_date: date, created_by: teacherId })),
      { onConflict: 'session_date', ignoreDuplicates: true }
    );

  if (insertError) {
    console.error('[attendance/save] session insert error:', insertError);
    return res.redirect(`/attendance/edit?week=${offset}`);
  }

  // 2. Fetch canonical session IDs (covers both new and pre-existing rows)
  const { data: sessions, error: fetchError } = await supabase
    .from('attendance_sessions')
    .select('id, session_date')
    .in('session_date', editableDates);

  if (fetchError || !sessions?.length) {
    console.error('[attendance/save] session fetch error:', fetchError);
    return res.redirect(`/attendance/edit?week=${offset}`);
  }

  const sessionByDate = Object.fromEntries(sessions.map((s) => [s.session_date, s.id]));

  // 3. Fetch all valid student IDs
  const { data: students } = await supabase.from('students').select('id');
  const studentIds = new Set((students ?? []).map((s) => String(s.id)));

  // 4. Build upsert payload: one row per student × editable day
  const records = [];
  for (const date of editableDates) {
    const sessionId = sessionByDate[date];
    if (!sessionId) continue;
    for (const studentId of studentIds) {
      records.push({
        session_id: sessionId,
        student_id: parseInt(studentId, 10),
        present: presentMap[studentId]?.[date] === '1',
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
    } else {
      console.log(`[attendance/save] wrote ${records.length} records for week offset ${offset}`);
    }
  }

  res.redirect(`/attendance?week=${offset}`);
});

export default router;
