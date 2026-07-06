import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Particles } from "@/lib/design";
import { KidPageShell } from "@/components/KidBottomNav";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

const SKILL_TREE = [
  { id: "memory", emoji: "🧠", stat: "memory", nameKey: "skill_memory" },
  { id: "speed", emoji: "⚡", stat: "speed", nameKey: "skill_speed" },
  { id: "focus", emoji: "🎯", stat: "focus", nameKey: "skill_focus" },
  { id: "combo", emoji: "🔥", stat: "combo", nameKey: "skill_combo" },
  { id: "defense", emoji: "🛡", stat: "defense", nameKey: "skill_defense" },
];

function deriveSkills(sessions) {
  const n = sessions.length || 1;
  const avgScore = sessions.reduce((a, s) => a + (s.score || 0), 0) / n;
  const maxCombo = Math.max(0, ...sessions.map((s) => s.max_combo || s.combo || 0));
  const accuracy = sessions.reduce((a, s) => {
    const c = s.correct || 0;
    const w = s.wrong || 0;
    return a + (c + w > 0 ? c / (c + w) : 0.5);
  }, 0) / n;
  return {
    memory: Math.min(10, 1 + Math.floor(avgScore / 200)),
    speed: Math.min(10, 1 + Math.floor(maxCombo / 2)),
    focus: Math.min(10, 1 + Math.floor(accuracy * 8)),
    combo: Math.min(10, 1 + Math.floor(maxCombo / 3)),
    defense: Math.min(10, 1 + Math.floor(sessions.filter((s) => (s.score || 0) >= 800).length)),
  };
}

function deriveAchievements(sessions, streak, t) {
  const total = sessions.length;
  const perfect = sessions.some((s) => s.wrong === 0 && (s.correct || 0) >= 5);
  const list = [
    { id: "first", emoji: "⭐", title: t("profile_ach_first"), desc: t("profile_ach_first_desc"), done: total >= 1 },
    { id: "streak5", emoji: "🔥", title: t("profile_ach_streak"), desc: t("profile_ach_streak_desc"), done: (streak?.current_streak || 0) >= 5 },
    { id: "perfect", emoji: "💎", title: t("profile_ach_perfect"), desc: t("profile_ach_perfect_desc"), done: perfect },
    { id: "polyglot", emoji: "🏆", title: t("profile_ach_polyglot"), desc: t("profile_ach_polyglot_desc"), done: total >= 40 },
  ];
  return list;
}

export default function KidProfilePage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [status, setStatus] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, ss, av, pr] = await Promise.allSettled([
          api.get("/home-status"),
          api.get("/game-sessions"),
          api.get("/profile/avatar"),
          api.get("/profile/me"),
        ]);
        if (s.status === "fulfilled") setStatus(s.value.data);
        if (ss.status === "fulfilled") setSessions(ss.value.data || []);
        if (av.status === "fulfilled") setAvatar(av.value.data);
        if (pr.status === "fulfilled") setProfile(pr.value.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalScore = sessions.reduce((a, s) => a + (s.score || 0), 0);
  const level = 1 + Math.floor(totalScore / 1000);
  const xpInLevel = totalScore % 1000;
  const streak = status?.streak || { current_streak: 0 };
  const energy = status?.energy || { energy: 60, max_energy: 100 };
  const diamonds = avatar?.diamonds ?? 0;
  const coins = avatar?.coins ?? 0;
  const equipped = avatar?.catalog?.find((sk) => sk.skin_id === avatar?.equipped_skin);
  const skills = deriveSkills(sessions);
  const serverBadges = avatar?.badges?.length ? avatar.badges : null;
  const achievements = serverBadges || deriveAchievements(sessions, streak, t).map((a) => ({
    badge_id: a.id,
    emoji: a.emoji,
    name: a.title,
    desc: a.desc,
    owned: a.done,
  }));
  const maxCombo = Math.max(0, ...sessions.map((s) => s.max_combo || s.combo || 0), 8);
  const learningDays = new Set(sessions.map((s) => (s.created_at || "").slice(0, 10))).size;

  const rankLabel = level >= 10 ? t("profile_rank_gold") : level >= 7 ? t("profile_rank_silver") : level >= 4 ? t("profile_rank_bronze") : t("profile_rank_rookie");

  if (loading) {
    return (
      <KidPageShell>
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">{t("loading")}</div>
      </KidPageShell>
    );
  }

  return (
    <KidPageShell>
      <div className="relative min-h-screen bg-slate-950 text-white" data-testid="profile-page">
        <Particles count={12} />
        <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl font-bold">{t("profile_title")}</h1>
            <button
              type="button"
              onClick={() => { sfx.click(); navigate("/settings"); }}
              className="text-sm text-sky-200/70 hover:text-white"
              data-testid="profile-settings-btn"
            >
              ⚙️ {t("profile_settings")}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-to-br from-indigo-900/80 to-slate-900 border border-white/10 p-5"
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">{equipped?.emoji || "🧒"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl font-bold truncate">{profile?.display_name || "Agent"}</div>
                <div className="text-xs text-sky-200/60 font-mono truncate">{profile?.public_user_id ? `ID ${profile.public_user_id}` : ""}</div>
                <div className="text-sm text-amber-200/90">🏅 {rankLabel}</div>
                <div className="text-xs text-sky-200/70 mt-1">🔥 {streak.current_streak}{t("day_streak")} · 💎 {diamonds} · 🪙 {coins}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/50">⭐ {t("profile_level")}</div>
                <div className="font-display text-2xl font-bold text-amber-300">{t("level", { n: level })}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{t("profile_xp_progress", { from: level, to: level + 1 })}</span>
                <span>{xpInLevel} / 1000 XP</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${(xpInLevel / 1000) * 100}%` }} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="text-xs text-white/50">❤️ {t("profile_hp")}</div>
                <div className="font-bold text-rose-300">85/100</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="text-xs text-white/50">⚡ {t("profile_energy")}</div>
                <div className="font-bold text-cyan-300">{energy.energy}/{energy.max_energy || 100}</div>
              </div>
            </div>
          </motion.div>

          <section className="mt-6">
            <h2 className="font-display text-lg font-bold mb-3">🌳 {t("profile_skill_tree")}</h2>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_TREE.map((sk) => (
                <div key={sk.id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
                  <span className="text-2xl">{sk.emoji}</span>
                  <div>
                    <div className="text-sm font-bold">{t(sk.nameKey)}</div>
                    <div className="text-xs text-amber-200/80">{t("level", { n: skills[sk.stat] })}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 rounded-xl border-white/20 text-white hover:bg-white/10"
              onClick={() => navigate("/skills")}
            >
              {t("profile_view_skills")}
            </Button>
          </section>

          <section className="mt-6">
            <h2 className="font-display text-lg font-bold mb-3">🎖 {t("profile_badges")}</h2>
            <div className="space-y-2">
              {achievements.map((a) => (
                <div
                  key={a.badge_id || a.id}
                  className={`rounded-2xl p-3 flex items-center gap-3 border ${(a.owned ?? a.done) ? "bg-amber-500/10 border-amber-400/30" : "bg-white/5 border-white/10 opacity-60"}`}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <div>
                    <div className="font-bold text-sm">{a.name || a.title}</div>
                    <div className="text-xs text-white/50">{a.desc}</div>
                  </div>
                  {(a.owned ?? a.done) && <span className="ml-auto text-amber-300 text-xs font-bold">✓</span>}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl bg-white/5 border border-white/10 p-4">
            <h2 className="font-display text-lg font-bold mb-3">{t("profile_my_scores")}</h2>
            <div className="flex justify-between items-center py-2 bg-amber-500/10 rounded-xl px-3">
              <span>🥇 {t("profile_total_xp")}</span>
              <span className="font-bold text-amber-300">{totalScore} XP</span>
            </div>
            <p className="mt-3 text-xs text-white/40 text-center border-t border-dashed border-white/10 pt-3">
              👥 <button type="button" className="underline hover:text-white/60" onClick={() => navigate("/leaderboard")}>{t("profile_leaderboard_link")}</button>
              {profile?.public_user_id ? ` · ${t("profile_share_id", { id: profile.public_user_id })}` : ""}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-lg font-bold text-orange-300">{t("level", { n: level })}</div>
                <div className="text-white/50">{t("profile_level")}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-lg font-bold text-red-400">×{maxCombo}</div>
                <div className="text-white/50">{t("profile_max_combo")}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-lg font-bold text-emerald-300">{learningDays || 1}</div>
                <div className="text-white/50">{t("profile_learning_days")}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </KidPageShell>
  );
}
