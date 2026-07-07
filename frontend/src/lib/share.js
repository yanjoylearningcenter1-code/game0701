/** Web Share API + fallback copy for viral hooks (Section 15.4). */
import { BRAND } from "@/lib/brand";

const APP_BASE = typeof window !== "undefined" ? window.location.origin : "";

export function buildInviteShareText(publicUserId, baseUrl = APP_BASE) {
  const url = `${baseUrl}/?invite=${encodeURIComponent(publicUserId || "")}`;
  return `Join me on ${BRAND.nameEn}! 🎮 Add my friend ID: ${publicUserId}\n${url}`;
}

export function buildVictoryShareText(result, publicUserId) {
  const streak = result.streak?.current_streak || 0;
  const score = result.score || 0;
  const boss = result.boss_name || "the Boss";
  const idSuffix = publicUserId ? ` 加我 ID：${publicUserId}` : "";
  if (result.bossDefeated) {
    return streak >= 3
      ? `🔥 ${streak}-day streak! I just defeated ${boss} on ${BRAND.nameEn} — ${score} points!${idSuffix}`
      : `🏆 I just defeated ${boss} on ${BRAND.nameEn} — ${score} points!${idSuffix}`;
  }
  return `⚔️ Training on ${BRAND.nameEn} — scored ${score} points battling ${boss}.${idSuffix}`;
}

export function buildBossShareText(status) {
  const due = status?.boss_status?.units_due || 0;
  const tier = status?.boss_status?.urgency_meta?.emoji || "📚";
  const id = status?.public_user_id ? ` ID:${status.public_user_id}` : "";
  return `${tier} ${due} words due today — challenge me on ${BRAND.nameEn}!${id}`;
}

export function buildBossCardShareText({ bossName, score, streak, publicUserId }) {
  return `🏆 Boss Card — defeated ${bossName || "the Boss"} on ${BRAND.nameEn}!\nScore ${score || 0} · Streak ${streak || 0} days\nJoin: ${APP_BASE}/?invite=${publicUserId || ""}`;
}

export async function shareText(text, url) {
  const shareUrl = url || window.location.origin;
  const payload = { title: BRAND.nameEn, text, url: shareUrl };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return true;
    } catch {
      /* user cancelled */
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
    return "copied";
  } catch {
    return false;
  }
}
