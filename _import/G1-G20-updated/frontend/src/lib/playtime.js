// Playtime — gentle "take a break" nudges after prolonged sessions.
// Kid-safety hygiene; NOT a hard lock (following v3 Section 14 principles).

const KEY = "play_session";
const BREAK_AFTER_MIN = 25;
const SNOOZE_MIN = 10;

function _read() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}

function _write(v) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(v));
}

export function startOrContinuePlaySession() {
  const now = Date.now();
  const cur = _read();
  if (!cur || now - cur.last > 20 * 60 * 1000) {
    _write({ start: now, last: now, snoozeUntil: 0 });
  } else {
    _write({ ...cur, last: now });
  }
}

export function shouldSuggestBreak() {
  const cur = _read();
  if (!cur) return false;
  const now = Date.now();
  if (cur.snoozeUntil && now < cur.snoozeUntil) return false;
  return now - cur.start >= BREAK_AFTER_MIN * 60 * 1000;
}

export function snoozePlaySession() {
  const cur = _read();
  if (!cur) return;
  _write({ ...cur, snoozeUntil: Date.now() + SNOOZE_MIN * 60 * 1000 });
}

export function resetPlaySession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
