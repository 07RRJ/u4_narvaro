// src/utils/attendance.js
// Renders the attendance calendar table in two modes:
//   - view mode:  color-coded cells (green / white / gray)
//   - edit mode:  checkboxes, gray out future days, save button

import { escape } from './html.js';
import { isFutureDate, dayName, shortDate, weekLabel } from './date.js';

// ── Week navigation bar ───────────────────────────────────────────────────────

export function renderWeekNav({ offset, basePath, csrfToken, isTeacher = false }) {
  const prev = offset - 1;
  const next = offset + 1;
  const label = weekLabel(offset);

  return `
  <div class="week-nav">
    <a href="${escape(basePath)}?week=${prev}" class="btn btn-secondary week-arrow">&#8592;</a>
    <span class="week-label">${escape(label)}</span>
    <a href="${escape(basePath)}?week=${next}" class="btn btn-secondary week-arrow">&#8594;</a>
    ${offset !== 0
      ? `<a href="${escape(basePath)}?week=0" class="btn btn-secondary">Current week</a>`
      : ''}
  </div>`;
}

// ── View mode (public + teacher read-only) ────────────────────────────────────
// Green = present, white/empty = absent or not marked, gray = future

export function renderViewTable({ students, sessions, records }) {
  if (!students.length) {
    return `<p class="empty">No students found.</p>`;
  }

  const headers = sessions.map((s) => `
    <th class="${isFutureDate(s.session_date) ? 'col-future' : ''}">
      <span class="day-name">${escape(dayName(s.session_date))}</span>
      <span class="day-date">${escape(shortDate(s.session_date))}</span>
    </th>`).join('');

  const rows = students.map((student) => {
    const cells = sessions.map((s) => {
      if (isFutureDate(s.session_date)) {
        return `<td class="cell-future"></td>`;
      }
      const rec = records.find(
        (r) => Number(r.session_id) === Number(s.id) && Number(r.student_id) === Number(student.id)
      );
      const present = rec?.present ?? false;
      return `<td class="cell-view ${present ? 'cell-present' : 'cell-absent'}"></td>`;
    }).join('');

    return `<tr>
      <td class="cell-student">${escape(student.full_name)}</td>
      ${cells}
    </tr>`;
  }).join('');

  return `
  <div class="table-wrap">
    <table class="attendance-table">
      <thead>
        <tr>
          <th class="col-student">Student</th>
          ${headers}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ── Edit mode (teacher only) ──────────────────────────────────────────────────
// Checkboxes per cell, future days grayed out and disabled, one Save button.
// On submit the entire week is overwritten for all students.

export function renderEditTable({ students, sessions, records, offset, csrfToken }) {
  if (!students.length) {
    return `<p class="empty">No students found. <a href="/students">Add students</a> first.</p>`;
  }

  const headers = sessions.map((s) => `
    <th class="${isFutureDate(s.session_date) ? 'col-future' : ''}">
      <span class="day-name">${escape(dayName(s.session_date))}</span>
      <span class="day-date">${escape(shortDate(s.session_date))}</span>
    </th>`).join('');

  const rows = students.map((student) => {
    const cells = sessions.map((s) => {
      if (isFutureDate(s.session_date)) {
        return `<td class="cell-future"></td>`;
      }
      const rec = records.find(
        (r) => Number(r.session_id) === Number(s.id) && Number(r.student_id) === Number(student.id)
      );
      const checked = rec?.present ? 'checked' : '';
      // Name encodes both student + date so the server can unpack it
      const fieldName = `present[s${student.id}][${s.session_date}]`;
      return `<td class="cell-edit">
        <input type="checkbox" name="${fieldName}" value="1" ${checked}
               class="attendance-check" aria-label="${escape(student.full_name)} ${escape(dayName(s.session_date))}"/>
      </td>`;
    }).join('');

    return `<tr>
      <td class="cell-student">${escape(student.full_name)}</td>
      ${cells}
    </tr>`;
  }).join('');

  return `
  <form method="POST" action="/attendance/save?week=${offset}" id="attendance-form">
    <input type="hidden" name="_csrf" value="${escape(csrfToken)}"/>
    <div class="table-wrap">
      <table class="attendance-table">
        <thead>
          <tr>
            <th class="col-student">Student</th>
            ${headers}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="edit-actions">
      <button type="submit" class="btn btn-primary">Save week</button>
      <a href="/attendance?week=${offset}" class="btn btn-secondary">Cancel</a>
    </div>
  </form>`;
}
