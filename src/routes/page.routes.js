// src/routes/page.routes.js
// Public-facing routes (no auth required).

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { publicTemplate } from '../utils/html.js';
import { getWeekDates } from '../utils/date.js';
import { renderWeekNav, renderViewTable } from '../utils/attendance.js';

const router = Router();

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

// ── GET / ─────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const offset = parseWeekOffset(req.query);
  const weekDates = getWeekDates(offset);
  const { students, sessions, records } = await fetchWeekData(weekDates);

  const nav = renderWeekNav({ offset, basePath: '/' });
  const table = renderViewTable({ students, sessions, records });

  res.send(publicTemplate('Overview', `
    <div class="page-header">
      <h1>Attendance overview</h1>
    </div>
    ${nav}
    ${table}
  `));
});

export default router;
