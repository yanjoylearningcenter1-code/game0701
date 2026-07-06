import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";
import { useGameFeel, rateReaction } from "@/lib/gameFeel";
import GameFireGun from "@/components/games/GameFireGun";

/**
 * TapChoiceGame — the flagship battle screen.
 *
 * A hybrid of four top kid games:
 *   • Piano Tiles     — falling tiles synced to a BPM pulse; timing rating
 *   • Fortnite/COD    — crosshair aim, laser beam, critical headshot glow
 *   • Fruit Ninja     — juicy on-hit particle bursts + screen shake
 *   • Puzzle&Dragons  — cascading combo counter with colour ramp
 *
 * Wrong = tile drops off-screen (miss) OR wrong tile hit (Boss attacks).
 * Right = tile explodes with rating (PERFECT / GREAT / GOOD) → damage scales.
 */

const FALL_DURATION_MS = 8200; // faster than the old 9600ms for tension
const LANE_COUNT = 4;
const BPM = 96; // Piano Tiles beat

const THEME_STYLE = {
  G3:  { arena: "from-rose-950/60 via-slate-950/80 to-slate-900 border-rose-400/30",     glow: "rgba(244,63,94,0.20)", icon: "🎯", labelKey: "shooter_label_g3",     target: "from-sky-500 to-blue-700 border-sky-300/60",    ring: "ring-rose-300",  beam: "#38bdf8", tint: "#f43f5e" },
  G10: { arena: "from-emerald-950/60 via-slate-950/80 to-slate-900 border-emerald-400/30", glow: "rgba(16,185,129,0.20)", icon: "🔍", labelKey: "shooter_label_g10",   target: "from-emerald-600 to-teal-800 border-emerald-300/60", mono: true, ring: "ring-emerald-300", beam: "#34d399", tint: "#10b981" },
  G11: { arena: "from-amber-950/60 via-slate-950/80 to-slate-900 border-amber-400/30",   glow: "rgba(245,158,11,0.20)", icon: "📖", labelKey: "shooter_label_g11",   target: "from-amber-500 to-orange-700 border-amber-300/60", ring: "ring-amber-300", beam: "#fbbf24", tint: "#f59e0b" },
  G13: { arena: "from-indigo-950/60 via-slate-950/80 to-slate-900 border-indigo-400/30", glow: "rgba(99,102,241,0.20)", icon: "📚", labelKey: "shooter_label_g13",   target: "from-indigo-500 to-violet-700 border-indigo-300/60", ring: "ring-indigo-300", beam: "#818cf8", tint: "#6366f1" },
  idiom_repair: { arena: "from-red-950/60 via-slate-950/80 to-slate-900 border-red-400/30", glow: "rgba(239,68,68,0.20)", icon: "🏮", labelKey: "shooter_label_idiom", target: "from-red-600 to-rose-800 border-red-300/60", ring: "ring-red-300", beam: "#f87171", tint: "#ef4444" },
  stroke_order: { arena: "from-slate-800/60 via-slate-950/80 to-slate-900 border-slate-400/30", glow: "rgba(148,163,184,0.16)", icon: "🖌️", labelKey: "shooter_label_stroke", target: "from-slate-600 to-slate-800 border-slate-300/50", mono: true, ring: "ring-slate-300", beam: "#94a3b8", tint: "#64748b" },
  default: { arena: "from-sky-950/60 via-slate-950/80 to-slate-900 border-sky-400/30", glow: "rgba(56,189,248,0.20)", icon: "🎯", labelKey: "shooter_label_default", target: "from-sky-500 to-blue-700 border-sky-300/60", ring: "ring-sky-300", beam: "#38bdf8", tint: "#0ea5e9" },
};

export default function TapChoiceGame({ challenge, onTap, disabled, variant, combo = 0 }) {
  const { t } = useLang();
  const fx = useGameFeel();
  const theme = THEME_STYLE[variant] || THEME_STYLE.default;
  const label = t(theme.labelKey);
  const [locked, setLocked] = useState(null);
  const [aim, setAim] = useState({ x: 50, y: 45 });
  const [beam, setBeam] = useState(null);
  const [missFlash, setMissFlash] = useState(null);
  const [showReference, setShowReference] = useState(false);
  const [pulse, setPulse] = useState(0);
  const arenaRef = useRef(null);
  const challengeStartRef = useRef(Date.now());
  const isTypoHunter = variant === "G10" && challenge.reference_sentence;

  // Rhythm-beat pulse (Piano Tiles) — tiles + arena scale-bob subtly on beat
  useEffect(() => {
    const iv = setInterval(() => setPulse((p) => p + 1), 60000 / BPM);
    return () => clearInterval(iv);
  }, []);

  const targets = useMemo(() => {
    const opts = challenge.options || [];
    const laneCount = Math.min(LANE_COUNT, Math.max(2, opts.length));
    return opts.map((opt, i) => ({
      opt,
      lane: i % laneCount,
      laneCount,
      delay: i * 0.42,
      id: `${i}-${opt}`,
    }));
  }, [challenge]);

  const aimFromEvent = (clientX, clientY) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAim({
      x: Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(8, Math.min(88, ((clientY - rect.top) / rect.height) * 100)),
    });
  };

  const findTargetAtAim = () => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const cx = rect.left + (aim.x / 100) * rect.width;
    const cy = rect.top + (aim.y / 100) * rect.height;
    const nodes = arenaRef.current?.querySelectorAll("[data-target-opt]");
    for (const node of nodes || []) {
      const r = node.getBoundingClientRect();
      const pad = 18;
      if (cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad) {
        return { opt: node.getAttribute("data-target-opt"), rect: r };
      }
    }
    return null;
  };

  const fire = () => {
    if (disabled || locked) return;
    const now = Date.now();
    const responseMs = now - challengeStartRef.current;
    setBeam({ id: now, x: aim.x, y: aim.y });
    setTimeout(() => setBeam(null), 220);

    const target = findTargetAtAim();
    if (target) {
      sfx.click();
      const isCorrect = target.opt === challenge.answer;
      const isCritical = isCorrect && responseMs < 700;

      if (isCorrect) {
        fx.hit(aim.x, aim.y, { combo: combo + 1, responseMs, critical: isCritical });
      } else {
        fx.miss(aim.x, aim.y);
      }
      setLocked(target.opt);
      // slight delay so the juice plays before parent's transition swap
      setTimeout(() => onTap(target.opt), 120);
    } else {
      sfx.wrong?.();
      setMissFlash(Date.now());
      setTimeout(() => setMissFlash(null), 400);
    }
  };

  useEffect(() => {
    setLocked(null);
    setMissFlash(null);
    setBeam(null);
    challengeStartRef.current = Date.now();
  }, [challenge]);

  const renderReference = () => {
    const ref = challenge.reference_sentence || "";
    const typo = challenge.typo_word || "";
    if (!typo || !ref.includes(typo)) return <span className="kaiti">{ref}</span>;
    const [before, after] = ref.split(typo);
    return (
      <span className="kaiti">
        {before}
        <span className="text-rose-400 underline decoration-wavy font-bold">{typo}</span>
        {after}
      </span>
    );
  };

  // Alternates between -1, 0, 1, 0, -1... producing a visible ~2% arena bob per beat.
  const beatScale = 1 + Math.sin(pulse * Math.PI / 2) * 0.02;

  return (
    <div data-testid="tap-choice-game" className="flex flex-col flex-1 min-h-[52vh] w-full">
      {isTypoHunter && (
        <div className="mb-2 flex justify-center shrink-0">
          <button type="button" data-testid="typo-reference-btn" onClick={() => setShowReference(true)} disabled={disabled}
            className="text-sm px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-300/40 active:scale-95 text-emerald-100">
            📄 {t("g10_reference_btn")}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showReference && isTypoHunter && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur flex items-center justify-center px-6"
            onClick={() => setShowReference(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full rounded-3xl bg-slate-900 border border-emerald-400/30 p-6 space-y-4" data-testid="typo-reference-modal">
              <h4 className="font-display text-lg font-bold text-emerald-100">{t("g10_reference_title")}</h4>
              <p className="text-base leading-relaxed text-white/90 text-center py-3 px-2 rounded-2xl bg-black/30">{renderReference()}</p>
              <button type="button" onClick={() => setShowReference(false)} className="w-full rounded-xl py-3 font-bold bg-emerald-500 text-slate-900">{t("ok")}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={arenaRef}
        data-testid="tap-options"
        animate={{ scale: beatScale }}
        transition={{ duration: 0.15 }}
        className={`relative flex-1 min-h-[40vh] w-full rounded-t-2xl overflow-hidden border-2 border-b-0 bg-gradient-to-b ${theme.arena} touch-none select-none`}
        onPointerMove={(e) => aimFromEvent(e.clientX, e.clientY)}
        onPointerDown={(e) => aimFromEvent(e.clientX, e.clientY)}
      >
        {/* Radial glow follows crosshair */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at ${aim.x}% ${aim.y}%, ${theme.glow}, transparent 55%)` }} />

        {/* Beat-synced horizontal scan line — Geometry Dash vibe */}
        <motion.div
          key={pulse}
          initial={{ opacity: 0.4, scaleX: 0.9 }}
          animate={{ opacity: 0, scaleX: 1.05 }}
          transition={{ duration: 60 / BPM }}
          className="absolute inset-x-0 h-px z-[5]"
          style={{ top: "50%", background: `linear-gradient(90deg, transparent, ${theme.tint}, transparent)` }}
        />

        {/* Lane guides */}
        {Array.from({ length: targets[0]?.laneCount || 2 }).map((_, lane) => (
          <div key={`lane-${lane}`} className="absolute top-0 bottom-0 border-r border-dashed border-white/5"
            style={{ left: `${(lane / (targets[0]?.laneCount || 2)) * 100}%`, width: `${100 / (targets[0]?.laneCount || 2)}%` }} />
        ))}

        {/* Laser beam from gun */}
        <AnimatePresence>
          {beam && (
            <motion.div key={beam.id} initial={{ opacity: 1 }} animate={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-30">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <motion.line
                  x1="50" y1="98" x2={beam.x} y2={beam.y}
                  stroke={theme.beam} strokeWidth="0.8"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.15 }}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crosshair */}
        <motion.div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${aim.x}%`, top: `${aim.y}%` }}>
          <motion.div
            animate={{ rotate: pulse * 20 }}
            transition={{ duration: 60 / BPM }}
            className="relative w-16 h-16"
          >
            <div className="absolute inset-0 rounded-full border-2 border-white/70" />
            <div className="absolute inset-1 rounded-full border border-white/40" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f87171]" />
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {missFlash && (
            <motion.div key={missFlash} initial={{ opacity: 1 }} animate={{ opacity: 0 }}
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 text-rose-400 font-display font-bold text-2xl"
              style={{ left: `${aim.x}%`, top: `${aim.y}%` }}>{t("shooter_miss")}</motion.div>
          )}
        </AnimatePresence>

        <p className="absolute top-2 inset-x-0 text-center text-[10px] text-white/40 pointer-events-none z-10">
          {theme.icon} {label} · {t("shooter_aim_hint")}
        </p>

        {/* Falling target tiles — Piano Tiles vibe */}
        {targets.map((target, optIndex) => {
          const isLocked = locked === target.opt;
          const laneWidth = 100 / target.laneCount;
          const laneCenter = laneWidth * target.lane + laneWidth / 2;
          return (
            <motion.div
              key={target.id}
              data-target-opt={target.opt}
              data-testid={`tap-option-${optIndex}`}
              role="presentation"
              initial={{ top: "-12%", opacity: 0 }}
              animate={{
                top: "78%",
                opacity: locked && !isLocked ? 0.3 : 1,
                rotate: isLocked ? [0, -6, 6, 0] : 0,
              }}
              transition={{
                top: { duration: FALL_DURATION_MS / 1000, ease: "linear", delay: target.delay },
                opacity: { duration: 0.25 },
                rotate: { duration: 0.4 },
              }}
              style={{ left: `${laneCenter}%` }}
              className={`absolute z-10 -translate-x-1/2 min-w-[5.5rem] px-4 py-3 rounded-xl border-b-4 font-display text-lg sm:text-xl font-bold bg-gradient-to-b ${theme.target} ${theme.mono ? "font-mono" : ""} ${isLocked ? `ring-4 ${theme.ring} scale-110` : ""} pointer-events-none`}
            >
              {target.opt}
              {/* Beat glow underline — Piano Tiles */}
              <motion.span
                key={pulse}
                initial={{ opacity: 0.7, scaleX: 1 }}
                animate={{ opacity: 0, scaleX: 1.4 }}
                transition={{ duration: 60 / BPM }}
                className="absolute -bottom-1 left-0 right-0 h-1 rounded-full"
                style={{ background: theme.beam, boxShadow: `0 0 8px ${theme.beam}` }}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Gun dock */}
      <div className="relative rounded-b-2xl border-2 border-t-0 bg-gradient-to-b from-slate-900 to-black px-4 pb-2 pt-3">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-3 h-8 bg-gradient-to-t from-slate-600 to-slate-400 rounded-t-sm" />
        <GameFireGun onFire={fire} disabled={disabled} ready={!locked} fired={!!locked} testId="tap-fire-btn" />
      </div>
    </div>
  );
}
