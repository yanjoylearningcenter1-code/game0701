// Exit & Save (spec Section 6.2 / 10.1: "退出並儲存" — mid-battle interruption
// shouldn't cost progress). This is a lightweight, client-side implementation:
// the whole battle state is self-contained (game payload + progress), so a kid
// can safely leave and resume exactly where they left off, without needing a
// full server-side Bundle/Round resume engine yet.
const KEY = "battle_snapshot";

export function saveBattleSnapshot(snapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
  } catch {
    /* storage full/unavailable — non-fatal, just means no resume available */
  }
}

export function loadBattleSnapshot() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    // Snapshots older than 7 days are probably stale/abandoned — don't resurrect them.
    if (!snap?.savedAt || Date.now() - snap.savedAt > 7 * 24 * 60 * 60 * 1000) {
      clearBattleSnapshot();
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

export function clearBattleSnapshot() {
  localStorage.removeItem(KEY);
}

/** Continue a saved battle from Upload (skip the in-battle resume prompt). */
export function continueBattleFromUpload() {
  const snap = loadBattleSnapshot();
  if (!snap?.game) return false;
  sessionStorage.setItem("game", JSON.stringify(snap.game));
  sessionStorage.setItem("battle_autoresume", "1");
  return true;
}
