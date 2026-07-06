// Diamonds — soft in-game currency persisted client-side.
//
// Earned from combos / boss defeats. Spent on Streak Save (rescue a broken
// combo mid-battle) — the foundation of the "diamond currency" hook that
// later unlocks skins / pets / cosmetics (Roblox / Genshin play).

const KEY = "diamonds_balance";
const STARTER = 5;

export function getDiamonds() {
  if (typeof window === "undefined") return STARTER;
  const raw = localStorage.getItem(KEY);
  if (raw === null) {
    localStorage.setItem(KEY, String(STARTER));
    return STARTER;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : STARTER;
}

export function addDiamonds(n) {
  const cur = getDiamonds();
  const next = Math.max(0, cur + n);
  localStorage.setItem(KEY, String(next));
  return next;
}

export function spendDiamonds(n) {
  const cur = getDiamonds();
  if (cur < n) return false;
  localStorage.setItem(KEY, String(cur - n));
  return true;
}
