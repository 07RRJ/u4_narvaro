// src/routes/students.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireTeacher } from '../middleware/auth.js';
import { escape, teacherTemplate } from '../utils/html.js';

const router = Router();

// ── GET /students ─────────────────────────────────────────────────────────────

router.get('/students', requireTeacher, async (req, res) => {
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, created_at')
    .order('full_name');

  const rows = (students ?? []).map((s) => `
    <tr>
      <td>${escape(s.full_name)}</td>
      <td>
        <form method="POST" action="/students/${s.id}/delete">
          <input type="hidden" name="_csrf" value="${escape(req.csrfToken())}"/>
          <button type="submit" class="btn btn-danger btn-sm"
                  onclick="return confirm('Remove ${escape(s.full_name)}?')">
            Remove
          </button>
        </form>
      </td>
    </tr>`).join('');

  res.send(teacherTemplate('Students', `
    <div class="page-header">
      <h1>Students</h1>
    </div>

    <div class="card" style="margin-bottom: 2rem;">
      <h2>Add student</h2>
      <form method="POST" action="/students/add" class="inline-form">
        <input type="hidden" name="_csrf" value="${escape(req.csrfToken())}"/>
        <input type="text" name="full_name" required placeholder="Full name" maxlength="100"/>
        <button type="submit" class="btn btn-primary">Add</button>
      </form>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th style="width: 100px;"></th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : '<tr><td colspan="2" class="empty">No students yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `, req.csrfToken()));
});

// ── POST /students/add ────────────────────────────────────────────────────────

router.post('/students/add', requireTeacher, async (req, res) => {
  const full_name = String(req.body.full_name ?? '').trim().slice(0, 100);

  if (!full_name) return res.redirect('/students');

  const { error } = await supabase.from('students').insert({ full_name });
  if (error) console.error('[students/add]', error);

  res.redirect('/students');
});

// ── POST /students/:id/delete ─────────────────────────────────────────────────

router.post('/students/:id/delete', requireTeacher, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!isNaN(id)) {
    // Records are deleted by ON DELETE CASCADE in the schema
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) console.error('[students/delete]', error);
  }
  res.redirect('/students');
});

export default router;
