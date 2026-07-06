// Progress Snapshot — persist mid-battle state so a kid can resume after
// interruption (parent takes phone, notification, accidental navigation).
// Uses localStorage; small payload; single active snapshot per browser.

const KEY = "battle_progress_snapshot";

export async function saveProgressSnapshot(snap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...snap, saved_at: Date.now() }));
  } catch (e) {
    console.warn("saveProgressSnapshot failed", e);
  }
}

export async function loadProgressSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    // Auto-expire snapshots older than 6 hours to avoid stale resumes
    if (snap.saved_at && Date.now() - snap.saved_at > 6 * 60 * 60 * 1000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return snap;
  } catch (e) {
    console.warn("loadProgressSnapshot failed", e);
    return null;
  }
}

export function clearProgressSnapshot() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
