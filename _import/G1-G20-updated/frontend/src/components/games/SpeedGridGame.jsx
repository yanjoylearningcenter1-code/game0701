import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import { useLang } from "@/lib/i18n";

/** G8 — tap every target before time runs out; full arena grid assault. */
export default function SpeedGridGame({ challenge, onCorrect, onWrong, disabled }) {
  const { t } = useLang();
  const targets = new Set(challenge.targets || [challenge.answer]);
  const grid = challenge.grid || [];
  const totalSec = challenge.time_limit_sec || 60;

  const targetSlots = useMemo(
    () => grid.map((w, i) => (targets.has(w) ? i : -1)).filter((i) => i >= 0),
    [grid, targets],
  );

  const [defused, setDefused] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(null);
  const [timeLeft, setTimeLeft] = useState(totalSec);
  const doneRef = useRef(false);
  const defusedRef = useRef(0);

  const urgent = timeLeft <= 10;
  const label = challenge.prompt_label || t("speed_grid_label");

  useEffect(() => {
    if (disabled || challenge.auto_play_audio === false) return undefined;
    const ans = challenge.answer;
    if (!ans) return undefined;
    const timer = setTimeout(() => speak(ans), 500);
    return () => clearTimeout(timer);
  }, [challenge.answer, challenge.auto_play_audio, disabled]);

  useEffect(() => {
    doneRef.current = false;
    defusedRef.current = 0;
    setDefused(new Set());
    setWrongFlash(null);
    setTimeLeft(totalSec);
    if (disabled) return undefined;

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!doneRef.current) {
            doneRef.current = true;
            if (defusedRef.current >= targetSlots.length) onCorrect();
            else onWrong();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [challenge, disabled, onCorrect, onWrong, targetSlots.length, totalSec]);

  const tap = (word, index) => {
    if (disabled || doneRef.current || defused.has(index)) return;
    sfx.click();
    speak(word);

    if (!targets.has(word)) {
      setWrongFlash(index);
      setTimeout(() => setWrongFlash(null), 400);
      sfx.wrong?.();
      return;
    }

    const next = new Set(defused);
    next.add(index);
    defusedRef.current = next.size;
    setDefused(next);
    sfx.correct?.() || sfx.click();

    if (next.size >= targetSlots.length && !doneRef.current) {
      doneRef.current = true;
      setTimeout(() => onCorrect(), 450);
    }
  };

  const pct = Math.max(0, (timeLeft / totalSec) * 100);

  return (
    <div
      data-testid="speed-grid"
      className={`flex flex-col flex-1 min-h-[52vh] w-full rounded-2xl border-2 overflow-hidden transition-colors ${
        urgent ? "bg-gradient-to-b from-rose-950/70 via-slate-950/50 to-slate-900/40 border-rose-400/50" : "bg-gradient-to-b from-cyan-950/50 via-slate-950/40 to-slate-900/30 border-cyan-400/30"
      }`}
    >
      <div className="shrink-0 px-4 pt-4 pb-2 space-y-2">
        {label && (
          <div className="text-sm font-display font-bold text-center text-cyan-100/90">{label}</div>
        )}
        <div className="flex items-center justify-center gap-3">
          <motion.span className="text-3xl" animate={urgent ? { scale: [1, 1.12, 1], rotate: [0, -8, 8, 0] } : {}} transition={{ duration: 0.45, repeat: urgent ? Infinity : 0 }}>
            ⚡
          </motion.span>
          <div className="flex-1 max-w-xs">
            <div className="h-3 rounded-full bg-slate-900/80 border border-white/10 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${urgent ? "bg-rose-400" : "bg-cyan-400"}`}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </div>
          <span
            className={`font-display text-xl font-bold tabular-nums min-w-[3.5rem] text-right ${urgent ? "text-rose-300 animate-pulse" : "text-cyan-200"}`}
            data-testid="speed-grid-timer"
          >
            {timeLeft}s
          </span>
        </div>
        <div className="text-xs text-cyan-200/80 text-center">
          {t("speed_grid_progress", { n: defused.size, total: targetSlots.length })}
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4 grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 content-start auto-rows-fr min-h-[36vh]">
        {grid.map((word, wi) => {
          const isDef = defused.has(wi);
          const isWrong = wrongFlash === wi;
          return (
            <motion.button
              key={`${wi}-${word}`}
              type="button"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: isDef ? 0.92 : 1 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => tap(word, wi)}
              disabled={disabled || isDef}
              className={`relative min-h-[4.5rem] rounded-xl border-b-4 flex items-center justify-center font-bold text-sm sm:text-base kaiti transition ${
                isDef
                  ? "bg-emerald-900/40 border-emerald-500/50 text-emerald-300"
                  : isWrong
                    ? "bg-rose-900/70 border-rose-500 animate-shake"
                    : "bg-white/10 border-amber-700/50 active:border-b-0 active:translate-y-1 active:bg-cyan-500/20"
              }`}
            >
              {isDef ? <span className="text-2xl">✓</span> : word}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
