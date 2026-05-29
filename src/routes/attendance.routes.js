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
  const realIds = sessions.filter((s) => s.id).map((s) => Number(s.id));
  if (realIds.length) {
    const { data } = await supabase
      .from('attendance_records')
      .select('session_id, student_id, present')
      .in('session_id', realIds)
      .limit(5000);
    // Normalize IDs to numbers so strict === comparisons work in templates
    records = (data ?? []).map((r) => ({
      ...r,
      session_id: Number(r.session_id),
      student_id: Number(r.student_id),
    }));
  }

  console.log('[fetchWeekData] students:', (students ?? []).map(s => `${s.id}:${s.full_name}`));
  console.log('[fetchWeekData] sessions:', sessions.map(s => `${s.session_date}(id=${s.id})`));
  console.log('[fetchWeekData] records count:', records.length);
  console.log('[fetchWeekData] present records:', records.filter(r=>r.present).map(r=>`s${r.student_id}@sess${r.session_id}`));
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

  // 2. Fetch sessions AND students together — same query as the view uses,
  //    so we get exactly the same student list that was rendered in the form.
  const { students: allStudents, sessions: allSessions } = await fetchWeekData(weekDates);
  const editableSessions = allSessions.filter((s) => s.id && editableDates.includes(s.session_date));

  if (!editableSessions.length) {
    console.error('[attendance/save] no sessions found for editable dates');
    return res.redirect(`/attendance/edit?week=${offset}`);
  }

  const sessionByDate = Object.fromEntries(editableSessions.map((s) => [s.session_date, Number(s.id)]));
  const studentIds = allStudents.map((s) => Number(s.id));
  console.log('[attendance/save] studentIds:', studentIds);

  // 4. Build records: one row per student × editable day
  const sessionIds = Object.values(sessionByDate).filter(Boolean);
  const records = [];
  for (const date of editableDates) {
    const sessionId = sessionByDate[date];
    if (!sessionId) continue;
    for (const studentId of studentIds) {
      records.push({
        session_id: sessionId,
        student_id: studentId,
        present: presentMap['s' + studentId]?.[date] === '1',
        marked_by: teacherId,
        marked_at: new Date().toISOString(),
      });
    }
  }

  if (records.length) {
    // Delete-then-insert avoids all ON CONFLICT complexity.
    // Supabase's onConflict upsert requires a named UNIQUE constraint;
    // our table only has a PRIMARY KEY which Postgres names automatically,
    // causing silent partial failures. Delete+insert is simpler and reliable.
    const { error: deleteError, count: deleteCount } = await supabase
      .from('attendance_records')
      .delete()
      .in('session_id', sessionIds);

    console.log('[attendance/save] deleted rows:', deleteCount, 'error:', deleteError);

    if (deleteError) {
      console.error('[attendance/save] delete error:', deleteError);
      return res.redirect(`/attendance/edit?week=${offset}`);
    }

    const { data: insertedRows, error: insertError2 } = await supabase
      .from('attendance_records')
      .insert(records)
      .select('session_id, student_id, present');

    if (insertError2) {
      console.error('[attendance/save] insert error:', insertError2);
    } else {
      console.log(`[attendance/save] sent ${records.length} records, DB confirmed ${insertedRows?.length}`);
      console.log('[attendance/save] present flags sent:', records.filter(r=>r.present).map(r=>`s${r.student_id}@${r.session_id}`));
      console.log('[attendance/save] present flags back:', insertedRows?.filter(r=>r.present).map(r=>`s${r.student_id}@${r.session_id}`));
    }
  }

  res.redirect(`/attendance?week=${offset}`);
});

export default router;
