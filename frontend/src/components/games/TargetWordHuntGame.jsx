import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";

import { useLang } from "@/lib/i18n";

/** HUNT — tap every matching cell in the grid. */
export default function TargetWordHuntGame({ challenge, onCorrect, onWrong, disabled }) {
  const { t } = useLang();
  const target = challenge.target || challenge.answer;
  const grid = challenge.grid || [];

  const targetIndices = useMemo(
    () => grid.map((w, i) => (w === target ? i : -1)).filter((i) => i >= 0),
    [grid, target],
  );

  const [found, setFound] = useState(new Set());

  const tap = (word, index) => {
    if (disabled || found.has(index)) return;
    sfx.click();
    speak(word);

    if (word !== target) {
      onWrong();
      return;
    }

    const next = new Set(found);
    next.add(index);
    setFound(next);

    if (next.size >= targetIndices.length) {
      setTimeout(() => onCorrect(), 400);
    }
  };

  return (
    <div data-testid="target-hunt-game" className="space-y-4">
      <div className="rounded-2xl bg-amber-500/15 border-2 border-amber-400/40 p-4 text-center">
        <div className="text-[10px] uppercase tracking-widest text-amber-200/80 mb-1">{t("target_hunt_title")}</div>
        <div className="font-display text-4xl font-bold text-amber-100 kaiti">{target}</div>
        <div className="text-xs text-amber-200/70 mt-2">
          {t("target_hunt_progress", { word: target, found: found.size, total: targetIndices.length })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {grid.map((word, i) => {
          const isFound = found.has(i);
          return (
            <motion.button
              key={`${i}-${word}`}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => tap(word, i)}
              disabled={disabled || isFound}
              className={`aspect-[4/3] rounded-xl border-b-4 flex items-center justify-center font-bold text-lg sm:text-xl kaiti transition-all ${
                isFound
                  ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-100 scale-95 opacity-70"
                  : "bg-white/10 border-white/25 hover:bg-amber-500/20 active:border-b-0 active:translate-y-1"
              }`}
            >
              {isFound ? "✓" : word}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
