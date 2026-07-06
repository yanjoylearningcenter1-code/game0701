import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Rhythm / typing-of-the-dead style — tap character keys to fill slots; each hit = strike. */
export default function StrikeSlotGame({
  answer,
  onComplete,
  disabled,
  label,
}) {
  const { t } = useLang();
  const displayLabel = label ?? t("strike_slot_label");
  const chars = useMemo(() => [...(answer || "")], [answer]);
  const keys = useMemo(() => {
    const extra = "天地人心手目耳口日月水火木金土";
    const set = new Set(chars);
    const pool = [...chars];
    for (const ch of extra) {
      if (pool.length >= chars.length + 5) break;
      if (!set.has(ch)) {
        pool.push(ch);
        set.add(ch);
      }
    }
    return shuffle(pool);
  }, [answer, chars]);

  const [index, setIndex] = useState(0);
  const [filled, setFilled] = useState([]);
  const [strike, setStrike] = useState(false);
  const [wrongKey, setWrongKey] = useState(null);

  const tapKey = (ch) => {
    if (disabled || index >= chars.length) return;
    if (ch !== chars[index]) {
      sfx.wrong?.();
      setWrongKey(ch);
      setTimeout(() => setWrongKey(null), 300);
      return;
    }
    sfx.correct?.() || sfx.click();
    setStrike(true);
    setTimeout(() => setStrike(false), 200);
    const nextFilled = [...filled, ch];
    const nextIndex = index + 1;
    setFilled(nextFilled);
    setIndex(nextIndex);
    if (nextIndex >= chars.length) {
      setTimeout(() => onComplete?.(nextFilled.join("")), 380);
    }
  };

  return (
    <div data-testid="strike-slot-game" className="space-y-4">
      <div className="text-center text-[10px] uppercase tracking-widest text-white/50">{displayLabel}</div>

      <div className="relative rounded-3xl border-2 border-rose-400/35 bg-gradient-to-b from-rose-950/40 to-slate-900/30 p-5 overflow-hidden">
        {strike && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 1] }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <span className="text-5xl">⚡</span>
          </motion.div>
        )}
        <div className="flex flex-wrap justify-center gap-1.5">
          {chars.map((_, i) => {
            const ch = filled[i];
            const active = i === index;
            return (
              <div
                key={`s-${i}`}
                className={`w-10 h-11 sm:w-11 sm:h-12 rounded-lg border-2 flex items-center justify-center font-display text-lg font-bold kaiti transition-all ${
                  ch
                    ? "bg-gradient-to-b from-rose-300 to-orange-500 border-orange-200 text-slate-900"
                    : active
                      ? "border-rose-300 bg-rose-500/20 text-rose-200 animate-pulse scale-110"
                      : "border-white/15 bg-white/5 text-white/20"
                }`}
              >
                {ch || "·"}
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-400 to-amber-400"
            animate={{ width: `${(index / Math.max(1, chars.length)) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-w-md mx-auto">
        {keys.map((ch, i) => (
          <motion.button
            key={`${i}-${ch}`}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => tapKey(ch)}
            disabled={disabled}
            className={`aspect-square rounded-xl border-b-4 font-display text-lg sm:text-xl font-bold kaiti bg-gradient-to-b from-white/15 to-white/5 border-white/20 hover:from-rose-500/25 active:border-b-0 active:translate-y-0.5 ${wrongKey === ch ? "ring-2 ring-rose-500" : ""}`}
            data-testid="strike-key"
          >
            {ch}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
