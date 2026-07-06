// Continuous play-time tracking (user amendment to Learning Journey Engine v3):
// never cut a session short, but if a kid has been playing non-stop for over an
// hour, gently suggest a break instead of just letting it run forever.
const KEY = "play_session_start_ts";
const BREAK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export function startOrContinuePlaySession() {
  if (!localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, String(Date.now()));
  }
}

export function getPlaySessionElapsedMs() {
  const start = Number(localStorage.getItem(KEY) || 0);
  if (!start) return 0;
  return Date.now() - start;
}

export function shouldSuggestBreak() {
  return getPlaySessionElapsedMs() >= BREAK_THRESHOLD_MS;
}

/** Call after showing the break prompt so the next nag is another hour away,
 * whether the kid takes the break or chooses to keep playing. */
export function snoozePlaySession() {
  localStorage.setItem(KEY, String(Date.now()));
}

/** Call when the kid deliberately leaves the adventure loop (goes home, closes
 * the app flow) — the next battle starts a fresh continuous-play clock. */
export function resetPlaySession() {
  localStorage.removeItem(KEY);
}
