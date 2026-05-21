// src/utils/sanitize.js
export function clampString(value, maxLen) {
  const v = String(value ?? '').trim();
  return v.length > maxLen ? v.slice(0, maxLen) : v;
}
