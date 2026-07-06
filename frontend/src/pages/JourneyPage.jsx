import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Particles } from "@/lib/design";
import { KidPageShell } from "@/components/KidBottomNav";
import { sfx } from "@/lib/audio";
import { toast } from "sonner";
import { getStepTheme } from "@/lib/stepThemes";
import { useLang } from "@/lib/i18n";
import { canCollectLearningData, fetchDataConsent, showNoSaveProgressToast } from "@/lib/consentNotice";

const JOURNEY_TITLES = {
  reading_dictation: { emoji: "📖", label: "讀默 Journey" },
  recital_dictation: { emoji: "🗡️", label: "背默 Journey" },
  quiz: { emoji: "⚡", label: "測驗 Journey" },
  exam: { emoji: "🏆", label: "考試 Journey" },
};

const GAME_EMOJI = [
  ["泡泡消除", "🫧"], ["記憶配對", "🃏"], ["咭卡翻轉", "🔄"], ["文字探測器", "🔍"],
  ["一觸即中", "🎯"], ["同義配對", "🔗"], ["填字入格", "✏️"], ["填字遊戲", "🧩"],
  ["救援行動", "🚁"], ["拼字重組", "🔤"], ["打字回想", "⌨️"], ["造句挑戰", "📝"],
  ["詞語切切樂", "✂️"], ["拆彈速讀", "💣"], ["Bubble", "🫧"], ["Memory", "🃏"],
  ["Flip", "🔄"], ["Detective", "🔍"], ["Tap", "🎯"], ["Synonym", "🔗"],
  ["Fill", "✏️"], ["Puzzle", "🧩"], ["Rescue", "🚁"], ["Scramble", "🔤"],
  ["Type", "⌨️"], ["Sentence", "📝"], ["Slice", "✂️"], ["Bomb", "💣"],
];

function gameEmoji(name) {
  const hit = GAME_EMOJI.find(([key]) => (name || "").includes(key));
  return hit ? hit[1] : "🎮";
}

const NODE_COLORS = {
  done: "bg-emerald-500 border-emerald-300 text-white shadow-[0_0_18px_rgba(16,185,129,0.6)]",
  active: "bg-amber-400 border-amber-200 text-slate-900 shadow-[0_0_24px_rgba(251,191,36,0.75)]",
  bonus: "bg-violet-500 border-violet-300 text-white shadow-[0_0_20px_rgba(139,92,246,0.65)]",
  bonus_waiting: "bg-slate-700 border-white/20 text-white/40",
  locked: "bg-slate-800 border-white/15 text-white/30",
};

const SCENERY = ["🌳", "⛰️", "🌤️", "🎈", "⭐", "🌵", "🍄", "🌊", "🏕️", "🌸"];
const ROW_H = 96;
const AMPLITUDE = 30; // % offset from center

const NODE_ACTIVE_RING = {
  meadow: "ring-emerald-400/60",
  library: "ring-sky-400/60",
  forge: "ring-amber-400/60",
  echo: "ring-violet-400/60",
  bonus: "ring-fuchsia-400/60",
  arena: "ring-cyan-400/60",
  sprint: "ring-rose-400/60",
  rehearsal: "ring-orange-400/70",
  finale: "ring-yellow-400/80",
  scroll: "ring-indigo-400/60",
};

function JourneyRoad({ steps, statusOf, locked, onPlay, gameEmoji }) {
  const n = steps.length || 1;
  const height = n * ROW_H + 60;
  const pointFor = (i) => ({
    xPct: 50 + AMPLITUDE * Math.sin(i * 1.05),
    y: i * ROW_H + 48,
  });
  const points = steps.map((_, i) => pointFor(i));
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.xPct} ${p.y}`)
    .join(" ");
  const doneCount = steps.filter((s) => statusOf(s) === "done").length;

  return (
    <div
      className="mt-8 relative px-2 rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-indigo-950/40 via-slate-900/30 to-slate-950/40"
      data-testid="journey-path"
      style={{ height }}
    >
      {/* Ambient scenery scattered on the "empty" side of the road so the
          map reads as a living game board, not a blank column. */}
      {steps.map((_, i) => {
        const p = pointFor(i);
        const decoXPct = 50 - (p.xPct - 50) * 0.75;
        return (
          <span
            key={`deco-${i}`}
            className="absolute text-2xl opacity-25 select-none"
            style={{ left: `${decoXPct}%`, top: p.y - 14, transform: "translateX(-50%)" }}
          >
            {SCENERY[i % SCENERY.length]}
          </span>
        );
      })}

      {/* Road trail */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.6" strokeDasharray="0.1 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {doneCount > 1 && (
          <path
            d={points.slice(0, doneCount).map((p, i) => `${i === 0 ? "M" : "L"} ${p.xPct} ${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(52,211,153,0.6)"
            strokeWidth="1.6"
            strokeDasharray="0.1 3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {steps.map((s, i) => {
        const st = statusOf(s);
        const p = pointFor(i);
        const themeId = s.step_theme?.theme_id;
        const activeRing = themeId ? NODE_ACTIVE_RING[themeId] : "ring-amber-300/60";
        return (
          <div
            key={s.step}
            className="absolute flex flex-col items-center gap-1"
            style={{ left: `${p.xPct}%`, top: p.y - 24, transform: "translateX(-50%)" }}
          >
            <motion.button
              type="button"
              data-testid={`journey-step-${s.step}`}
              disabled={st === "locked" || st === "bonus_waiting"}
              onClick={() => {
                if (st === "active" && !locked) onPlay(s.step);
                else if (st === "bonus") onPlay(s.step);
                else if (st === "done") onPlay(s.step);
              }}
              whileHover={st !== "locked" && st !== "bonus_waiting" ? { scale: 1.05 } : undefined}
              whileTap={st !== "locked" && st !== "bonus_waiting" ? { scale: 0.95 } : undefined}
              animate={st === "active" ? { scale: [1, 1.08, 1], y: [0, -4, 0] } : st === "bonus" ? { scale: [1, 1.05, 1] } : {}}
              transition={st === "active" ? { duration: 1.6, repeat: Infinity } : st === "bonus" ? { duration: 2, repeat: Infinity } : {}}
              className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center font-display font-bold text-sm ${NODE_COLORS[st] || NODE_COLORS.locked} ${st === "locked" || st === "bonus_waiting" ? "cursor-not-allowed" : "cursor-pointer"}`}
              title={st === "done" ? "再玩一次" : undefined}
            >
              {st === "active" && (
                <motion.span
                  className={`absolute inset-0 rounded-full border-2 ring-2 ${activeRing}`}
                  animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
              {st === "done" ? "✓" : st === "locked" ? "🔒" : st === "bonus_waiting" ? "⏰" : st === "bonus" ? "✨" : (s.step_theme?.theme_id ? getStepTheme(s.step_theme.theme_id).emoji : s.step)}
              <span className="absolute -bottom-1 -right-1 text-xs bg-slate-950 rounded-full w-5 h-5 flex items-center justify-center border border-white/20">
                {gameEmoji((s.game_options_labels || s.game_options || [])[0] || "")}
              </span>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}

export default function JourneyPage() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const [journey, setJourney] = useState(null);
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = async () => {
    try {
      const [j, t] = await Promise.all([
        api.get(`/tracks/${trackId}/journey`),
        api.get(`/tracks/${trackId}`),
      ]);
      setJourney(j.data);
      setTrack(t.data?.track || t.data);
    } catch (e) {
      toast.error("Could not load journey");
      navigate("/home");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  const startStep = async (stepNum) => {
    sfx.click();
    setStarting(true);
    try {
      const playStep = stepNum ?? current;
      const consent = await fetchDataConsent();
      if (!canCollectLearningData(consent) && playStep % 2 === 1) {
        showNoSaveProgressToast(t, playStep);
      }
      sessionStorage.setItem("track_id", trackId);
      sessionStorage.setItem("mode", track?.track_type || journey?.track_type || "reading_dictation");
      const r = await api.post(`/tracks/${trackId}/step-battle?step=${playStep}`);
      sessionStorage.setItem("game", JSON.stringify(r.data.game));
      sessionStorage.setItem("game_unit_ids", JSON.stringify(r.data.unit_ids || []));
      sessionStorage.setItem("journey_step", String(r.data.journey_step || 1));
      navigate("/battle");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Step locked or unavailable");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <KidPageShell>
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading…</div>
      </KidPageShell>
    );
  }

  const current = journey?.current_step || 1;
  const steps = journey?.steps || [];
  const activeStep = steps.find((s) => s.step === current);
  const locked = activeStep?.lock && !activeStep.lock.unlocked;
  const bundleLabel = (journey?.bundle_count || 1) > 1
    ? `Bundle ${(journey?.current_bundle_index || 0) + 1} / ${journey.bundle_count}`
    : null;

  const trackType = journey?.track_type || track?.track_type || "reading_dictation";
  const journeyMeta = JOURNEY_TITLES[trackType] || JOURNEY_TITLES.reading_dictation;

  const statusOf = (s) => {
    if (s.status === "done") return "done";
    if (s.status === "bonus") return "bonus";
    if (s.status === "bonus_waiting") return "bonus_waiting";
    if (s.step === current) return "active";
    return "locked";
  };
  const games = (activeStep?.game_options_labels || activeStep?.game_options || []);
  const maxStep = journey?.max_step || steps.length || 10;
  const trackComplete = journey?.track_status === "completed";
  const activeTheme = activeStep?.step_theme?.theme_id
    ? getStepTheme(activeStep.step_theme.theme_id)
    : getStepTheme("meadow");
  const activeTagline = activeStep?.step_theme?.tagline_zh || activeStep?.name_zh;

  return (
    <KidPageShell>
      <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden" data-testid="journey-page">
        <Particles count={16} />
        <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
          <button onClick={() => navigate("/home")} className="text-sky-200/70 hover:text-white text-sm mb-4">← 主頁</button>
          <h1 className="font-display text-2xl font-bold">{journeyMeta.emoji} {journeyMeta.label}</h1>
          <p className="text-sky-100/60 text-sm mt-1 truncate">{track?.scope_description || journeyMeta.label}</p>
          {bundleLabel && (
            <p className="text-amber-200/80 text-xs mt-1">📦 {bundleLabel}</p>
          )}

          {/* Winding path — a real game-board road (sine-curve, SVG trail,
              scattered scenery) instead of two bare left/right columns with
              an empty middle. */}
          <JourneyRoad
            steps={steps}
            statusOf={statusOf}
            locked={locked}
            onPlay={startStep}
            gameEmoji={gameEmoji}
          />

          {locked && (
            <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm" data-testid="step-lock-banner">
              ⏰ {activeStep.lock.message || "Step locked — check back later"}
            </div>
          )}

          {/* Active step detail card — the ONLY step shown in full, so it reads
              like "here's what you're about to play" rather than a spec sheet
              for the whole track. */}
          {activeStep && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 rounded-3xl border-2 p-5 ${activeTheme.banner} ${activeTheme.arena}`}
              data-testid="active-step-card"
            >
              <div className="text-xs uppercase tracking-widest font-bold opacity-80">
                {activeStep.optional ? "✨ 額外挑戰" : activeStep.rehearsal ? "🎯 彩排關" : activeStep.single_pass ? "🏁 決賽關" : activeStep.timed_mission ? "⏱ 限時任務" : `${activeTheme.emoji} Step ${activeStep.step}`}
              </div>
              <div className="font-display text-xl font-bold mt-1">{activeStep.name_zh}</div>
              <div className="text-sm opacity-70">{activeTagline}</div>

              <div className="flex flex-wrap gap-2 mt-4">
                {games.map((g, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black/30 border border-white/15 px-3 py-1.5 text-sm font-bold"
                  >
                    <span className="text-lg">{gameEmoji(g)}</span> {g}
                  </span>
                ))}
              </div>

              <div className="text-xs opacity-60 mt-3">
                {activeStep.rehearsal
                  ? "🎯 彩排 — 有提示、可補考，80% 通過"
                  : activeStep.single_pass
                    ? "🏁 決賽 — 全部一次、90% 通關"
                    : activeStep.optional_pass
                      ? "🎯 Optional round"
                      : `🎯 Pass ≥${activeStep.pass_pct}%`}
              </div>
              {activeStep.lock_hours > 0 && (
                <div className="text-[11px] text-sky-300/70 mt-1">
                  ⏰ {activeStep.lock_hours}hr wait after previous step
                  {activeStep.lock_hours_range && activeStep.lock_hours !== activeStep.lock_hours_range[0] && (
                    <span> (48–72hr range)</span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          <Button
            data-testid="journey-start-btn"
            disabled={(locked && !trackComplete) || starting}
            onClick={() => startStep(trackComplete ? maxStep : undefined)}
            className="btn-tactile w-full mt-6 rounded-2xl py-7 text-lg font-display font-bold bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900 disabled:opacity-50"
          >
            {trackComplete
              ? (starting ? "Loading…" : "🔄 再玩最終關")
              : locked
                ? "⏰ Step locked"
                : starting
                  ? "Loading…"
                  : `▶ Play Step ${current}`}
          </Button>
        </div>
      </div>
    </KidPageShell>
  );
}
