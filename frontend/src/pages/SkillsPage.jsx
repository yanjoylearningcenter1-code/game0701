import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Particles } from "@/lib/design";
import { KidPageShell } from "@/components/KidBottomNav";
import { useLang } from "@/lib/i18n";

function deriveSkills(sessions) {
  const n = Math.max(1, sessions.length);
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

export default function SkillsPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const SKILLS = [
    { id: "memory", emoji: "🧠", nameKey: "skill_memory", descKey: "skill_memory_desc", color: "from-violet-500/30 to-purple-900/30" },
    { id: "speed", emoji: "⚡", nameKey: "skill_speed", descKey: "skill_speed_desc", color: "from-amber-500/30 to-orange-900/30" },
    { id: "focus", emoji: "🎯", nameKey: "skill_focus", descKey: "skill_focus_desc", color: "from-sky-500/30 to-blue-900/30" },
    { id: "combo", emoji: "🔥", nameKey: "skill_combo", descKey: "skill_combo_desc", color: "from-rose-500/30 to-red-900/30" },
    { id: "defense", emoji: "🛡", nameKey: "skill_defense", descKey: "skill_defense_desc", color: "from-emerald-500/30 to-teal-900/30" },
  ];

  useEffect(() => {
    api.get("/game-sessions")
      .then((r) => setSessions(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const levels = deriveSkills(sessions);

  return (
    <KidPageShell>
      <div className="relative min-h-screen bg-slate-950 text-white" data-testid="skills-page">
        <Particles count={10} />
        <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
          <button onClick={() => navigate("/home")} className="text-sky-200/70 hover:text-white text-sm mb-4">← {t("nav_home")}</button>
          <h1 className="font-display text-3xl font-bold">⚡ {t("skills_title")}</h1>
          <p className="text-sky-100/60 text-sm mt-1">{t("skills_sub")}</p>

          {loading ? (
            <p className="mt-8 text-white/50">{t("loading")}</p>
          ) : (
            <div className="mt-6 space-y-4">
              {SKILLS.map((sk) => {
                const lv = levels[sk.id] || 1;
                const pct = (lv / 10) * 100;
                return (
                  <div key={sk.id} className={`rounded-3xl bg-gradient-to-br ${sk.color} border border-white/10 p-4`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{sk.emoji}</span>
                      <div>
                        <div className="font-display font-bold text-lg">{t(sk.nameKey)}</div>
                        <div className="text-xs text-white/60">{t(sk.descKey)}</div>
                      </div>
                      <div className="ml-auto font-display text-xl font-bold text-amber-300">{t("level", { n: lv })}</div>
                    </div>
                    <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-white/40 mt-1 text-right">{lv}/10</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </KidPageShell>
  );
}
