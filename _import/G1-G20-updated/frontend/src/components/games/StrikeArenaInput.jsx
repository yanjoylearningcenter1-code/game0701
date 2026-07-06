import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";
import { useGameFeel } from "@/lib/gameFeel";
import GameActionButton from "@/components/games/GameActionButton";

/**
 * StrikeArenaInput — the arcade typing runway used by Dictation / FullRecall /
 * MemoryWrite. Rebuilt to feel like a real game (not "heading + box").
 *
 * DNA borrowed from:
 *   • Z-Type / Typing of the Dead — enemies drop, each keystroke fires a laser
 *   • Guitar Hero / Piano Tiles   — highway of empty slots pulsing on the beat
 *   • Osu!                        — precision character-hit rings + score
 *   • Subway Surfers              — speed-line backdrop + urgency pulse
 *
 * Every keystroke:
 *   – fires a projectile from bottom → the next empty slot
 *   – on slot impact: burst particles, +combo, tiny screen kick
 *   – wrong length or backspace = "misfire" red shake
 *   – all slots filled → auto-arm & flash the Fire button
 *
 * Backwards-compatible props (kept identical to prior version so DictationGame /
 * FullRecallGame / MemoryWriteGame keep working):
 *   value, onChange, onSubmit, disabled, slotCount, status, accent, action,
 *   testId, submitTestId, multiline, minSubmitLength, className, children
 */

const ACCENTS = {
  cyan:    { base: "cyan",    glow: "rgba(34,211,238,0.55)",   filled: "from-cyan-300 to-blue-500 border-cyan-200",           active: "border-cyan-300 bg-cyan-500/25",   idle: "border-white/10 bg-white/5",   projectile: "#22d3ee", enemy: "🐉" },
  amber:   { base: "amber",   glow: "rgba(251,191,36,0.55)",   filled: "from-amber-300 to-orange-500 border-amber-200",       active: "border-amber-300 bg-amber-500/25", idle: "border-white/10 bg-white/5",   projectile: "#fbbf24", enemy: "👹" },
  emerald: { base: "emerald", glow: "rgba(52,211,153,0.55)",   filled: "from-emerald-300 to-teal-500 border-emerald-200",     active: "border-emerald-300 bg-emerald-500/25", idle: "border-white/10 bg-white/5", projectile: "#34d399", enemy: "🧟" },
  indigo:  { base: "indigo",  glow: "rgba(129,140,248,0.55)",  filled: "from-indigo-300 to-violet-500 border-indigo-200",     active: "border-indigo-300 bg-indigo-500/25", idle: "border-white/10 bg-white/5", projectile: "#818cf8", enemy: "👾" },
  sky:     { base: "sky",     glow: "rgba(56,189,248,0.55)",   filled: "from-sky-300 to-blue-500 border-sky-200",             active: "border-sky-300 bg-sky-500/25",     idle: "border-white/10 bg-white/5",   projectile: "#38bdf8", enemy: "🛸" },
};

let _projId = 0;

export default function StrikeArenaInput({
  value, onChange, onSubmit, disabled, slotCount, status = "idle", accent = "cyan",
  action = "strike", testId = "typing-input", submitTestId = "typing-submit-btn",
  multiline = false, minSubmitLength = 1, className = "", children,
}) {
  const { t, lang } = useLang();
  const fx = useGameFeel();
  const inputRef = useRef(null);
  const composingRef = useRef(false);
  const [composing, setComposing] = useState(false);
  const [projectiles, setProjectiles] = useState([]); // {id, targetSlot, ch, x_start}
  const [bursts, setBursts] = useState([]);           // {id, slot}
  const [misfire, setMisfire] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [urgency, setUrgency] = useState(0);          // 0..1 — enemy attack meter
  const lastValueRef = useRef(value);
  const startedRef = useRef(false);

  const theme = ACCENTS[accent] || ACCENTS.cyan;
  const chars = [...value];
  const slots = slotCount ? Math.max(slotCount, chars.length) : Math.max(chars.length, 4);
  const ready = value.trim().length >= minSubmitLength && !composing;
  const complete = slotCount && chars.length >= slotCount && !composing;

  // Rhythm beat @ 110 BPM ~ arcade tension pace
  useEffect(() => {
    const iv = setInterval(() => setPulse((p) => p + 1), 60000 / 110);
    return () => clearInterval(iv);
  }, []);

  // Enemy attack urgency meter — fills over ~20s if no typing progress.
  // Serves purely as visual tension; doesn't actually force-submit.
  useEffect(() => {
    if (disabled) return undefined;
    const iv = setInterval(() => {
      setUrgency((u) => Math.min(1, u + 0.005));
      // Reset urgency when the user makes progress
      if (chars.length > 0) setUrgency((u) => Math.max(0, u - 0.02));
    }, 200);
    return () => clearInterval(iv);
  }, [disabled, chars.length]);

  useEffect(() => {
    if (disabled) return;
    inputRef.current?.focus();
  }, [disabled, slotCount]);

  // Fire a projectile whenever a NEW character was typed (not on delete, not on IME compose).
  const spawnProjectile = useCallback((newChars, prevChars) => {
    if (newChars.length <= prevChars.length) return;
    const ch = newChars[newChars.length - 1];
    const targetSlot = newChars.length - 1;
    const id = ++_projId;
    setProjectiles((p) => [...p, { id, targetSlot, ch }]);
    // slot burst after projectile flight (~250ms)
    setTimeout(() => {
      setBursts((b) => [...b, { id, slot: targetSlot }]);
      setTimeout(() => setBursts((b) => b.filter((it) => it.id !== id)), 500);
      setProjectiles((p) => p.filter((it) => it.id !== id));
      // Feed the global gameFeel just a tiny hit — subtle, no full popRating spam per key
      fx.burst?.(50, 40 + Math.random() * 10, { count: 6, color: theme.base === "amber" ? "amber" : "cyan" });
    }, 240);
  }, [fx, theme.base]);

  const handleChange = (e) => {
    const next = e.target.value;
    const prev = lastValueRef.current;
    onChange(next);
    if (!composingRef.current) {
      if (next.length > prev.length) {
        sfx.click();
        spawnProjectile([...next], [...prev]);
        if (!startedRef.current) startedRef.current = true;
      } else if (next.length < prev.length) {
        // Backspace = misfire flash
        setMisfire(Date.now());
        setTimeout(() => setMisfire(0), 260);
      }
    }
    lastValueRef.current = next;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !composing && !e.shiftKey && ready) {
      e.preventDefault();
      onSubmit();
    }
  };

  const beatBob = 1 + (Math.abs(Math.sin(pulse * Math.PI / 2)) * 0.03);
  const showUrgency = urgency > 0.5;

  return (
    <div className={`relative w-full flex flex-col gap-3 ${className}`}>
      {children}

      {/* Arena — enemy at top, runway middle, hidden capture below */}
      <motion.div
        animate={{ scale: beatBob }}
        transition={{ duration: 0.12 }}
        className={`relative rounded-2xl border-2 overflow-hidden cursor-text ${
          status === "correct" ? "border-emerald-400" :
          status === "wrong" ? "border-rose-400 shake" :
          misfire ? "border-rose-500 shake" :
          "border-white/10"
        } bg-gradient-to-b from-slate-950 via-slate-900 to-black p-4 sm:p-5 min-h-[220px]`}
        onClick={() => !disabled && inputRef.current?.focus()}
        role="presentation"
        style={{ boxShadow: `0 0 32px ${theme.glow}` }}
      >
        {/* Speed-line backdrop */}
        <div className="absolute inset-0 pointer-events-none opacity-25" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 260, opacity: [0, 0.7, 0] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4, ease: "linear" }}
              className="absolute h-16 w-px"
              style={{ left: `${(i * 17 + 8) % 100}%`, background: `linear-gradient(180deg, transparent, ${theme.projectile}, transparent)` }}
            />
          ))}
        </div>

        {/* Enemy sprite hovering at top */}
        {!multiline && (
          <div className="relative flex justify-center mb-2 h-12">
            <motion.div
              animate={{
                y: [0, -4, 0, 4, 0],
                x: showUrgency ? [-3, 3, -3] : 0,
                scale: showUrgency ? [1, 1.08, 1] : 1,
              }}
              transition={{
                y: { duration: 2, repeat: Infinity },
                x: { duration: 0.3, repeat: showUrgency ? Infinity : 0 },
                scale: { duration: 0.4, repeat: showUrgency ? Infinity : 0 },
              }}
              className={`text-4xl drop-shadow-[0_2px_12px_${theme.glow}]`}
              aria-hidden
            >
              {theme.enemy}
            </motion.div>
            {/* Enemy HP = slots filled ratio */}
            <div className="absolute top-0 right-2 w-24 h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
              <motion.div
                animate={{ width: `${Math.min(100, (chars.length / slots) * 100)}%` }}
                transition={{ duration: 0.25 }}
                className="h-full bg-gradient-to-r from-rose-400 to-amber-300"
              />
            </div>
            {/* Attack meter (enemy's rage) */}
            <div className="absolute top-3 right-2 w-24 h-1 rounded-full bg-slate-900/80 overflow-hidden">
              <motion.div
                animate={{ width: `${urgency * 100}%` }}
                className="h-full bg-rose-500"
              />
            </div>
          </div>
        )}

        {/* Character slots — the runway */}
        {multiline ? (
          <div className="relative flex flex-wrap justify-center gap-1.5 min-h-[4rem]">
            {chars.map((ch, i) => (
              <motion.span
                key={`ch-${i}-${ch}`}
                initial={{ scale: 0.4, y: -12, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className={`inline-flex min-w-[1.75rem] h-9 px-1 rounded-lg border-2 items-center justify-center font-display text-lg kaiti bg-gradient-to-b ${theme.filled} text-slate-900`}
                style={{ boxShadow: `0 0 8px ${theme.glow}` }}
              >{ch === " " ? "␣" : ch}</motion.span>
            ))}
            {composing && (
              <span className="inline-flex min-w-[2rem] h-9 px-2 rounded-lg border-2 border-violet-400 bg-violet-500/30 items-center justify-center text-sm kaiti text-violet-100 animate-pulse">…</span>
            )}
          </div>
        ) : (
          <div className="relative flex flex-wrap justify-center gap-1.5 sm:gap-2 py-2">
            {Array.from({ length: slots }).map((_, i) => {
              const ch = chars[i];
              const isActive = !composing && i === chars.length && !complete;
              const isCompose = composing && i === chars.length;
              const hasBurst = bursts.some((b) => b.slot === i);
              return (
                <div key={`slot-${i}`} className="relative">
                  <motion.div
                    animate={
                      isActive || isCompose
                        ? { scale: [1, 1.12, 1], boxShadow: [`0 0 8px ${theme.glow}`, `0 0 20px ${theme.glow}`, `0 0 8px ${theme.glow}`] }
                        : hasBurst
                        ? { scale: [1, 1.35, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.55, repeat: isActive || isCompose ? Infinity : 0 }}
                    className={`w-10 h-11 sm:w-11 sm:h-12 rounded-xl border-2 flex items-center justify-center font-display text-xl font-bold kaiti ${
                      ch ? `bg-gradient-to-b ${theme.filled} text-slate-900`
                        : isCompose ? "border-violet-400 bg-violet-500/30 text-violet-100"
                        : isActive ? theme.active + " text-white"
                        : theme.idle + " text-white/25"
                    }`}
                  >
                    {ch || (isCompose ? "…" : isActive ? "▮" : "·")}
                  </motion.div>

                  {/* Impact burst overlay */}
                  <AnimatePresence>
                    {hasBurst && (
                      <motion.div
                        initial={{ scale: 0.4, opacity: 1 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ background: `radial-gradient(circle, ${theme.projectile}66, transparent 70%)` }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Beat glow bar under the runway */}
        <motion.div
          key={pulse}
          initial={{ opacity: 0.55, scaleX: 0.95 }}
          animate={{ opacity: 0, scaleX: 1.05 }}
          transition={{ duration: 60 / 110 }}
          className="mt-3 mx-auto h-0.5 rounded-full max-w-[80%]"
          style={{ background: theme.projectile, boxShadow: `0 0 12px ${theme.projectile}` }}
        />

        {/* Live projectiles — animate from bottom-center to the target slot */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <AnimatePresence>
            {projectiles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ bottom: 4, left: "50%", opacity: 1, scale: 1 }}
                animate={{ bottom: multiline ? "45%" : "45%", left: `${((p.targetSlot + 0.5) / slots) * 100}%`, opacity: 0.2, scale: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute -translate-x-1/2 font-display font-bold text-xl kaiti"
                style={{ color: theme.projectile, textShadow: `0 0 8px ${theme.projectile}` }}
              >{p.ch === " " ? "·" : p.ch}</motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Hidden real input — captures physical keys & IME */}
        <input
          ref={inputRef}
          data-testid={testId}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; setComposing(true); }}
          onCompositionEnd={(e) => { composingRef.current = false; setComposing(false); onChange(e.target.value); lastValueRef.current = e.target.value; }}
          disabled={disabled}
          autoFocus
          lang={lang === "zh-HK" ? "zh-HK" : "en"}
          aria-label={t("strike_input_aria")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="absolute opacity-0 pointer-events-none inset-x-0 bottom-0 h-8"
        />

        {composing && (
          <p className="text-center text-[10px] mt-1 kaiti text-white/50">{t("strike_composing")}</p>
        )}
      </motion.div>

      {/* Prompt strip — tiny helper, replaces the old boring header */}
      <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest text-white/45">
        <span>⌨</span>
        <span>{t("strike_input_aria")}</span>
        <span className="text-amber-300 font-bold">
          {complete ? "▶ ENTER" : `${chars.length}/${slots}`}
        </span>
      </div>

      <GameActionButton
        variant={action}
        onAction={onSubmit}
        disabled={disabled}
        ready={ready}
        testId={submitTestId}
      />
    </div>
  );
}
