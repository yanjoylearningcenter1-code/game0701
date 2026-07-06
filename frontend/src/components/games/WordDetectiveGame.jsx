import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";

import { useLang } from "@/lib/i18n";

/** G12 / G4-zh — detective spotlight arena */
export default function WordDetectiveGame({ challenge, onTap, disabled }) {
  const { t } = useLang();
  const isComponent = challenge.component_mode;
  const [locked, setLocked] = useState(null);
  const [spot, setSpot] = useState({ x: 50, y: 40 });

  const options = useMemo(() => challenge.options || [], [challenge.options]);

  const tap = (opt, i) => {
    if (disabled || locked) return;
    sfx.click();
    setLocked(opt);
    setSpot({ x: 20 + (i % 2) * 60, y: 55 + Math.floor(i / 2) * 18 });
    onTap(opt);
  };

  return (
    <div
      data-testid="word-detective"
      className="relative flex flex-col flex-1 min-h-[52vh] w-full rounded-2xl border-2 border-orange-400/30 bg-gradient-to-b from-orange-950/50 via-slate-950/50 to-slate-900/40 overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, rgba(251,146,60,0.18), transparent 45%)`,
        }}
      />

      <div className="relative z-10 p-4 sm:p-5 flex flex-col flex-1 gap-4">
        {challenge.display && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center font-display text-4xl sm:text-5xl tracking-widest bg-black/30 rounded-2xl py-6 border border-orange-400/20 kaiti shadow-inner"
          >
            {challenge.display}
          </motion.div>
        )}

        {isComponent && (
          <p className="text-center text-xs uppercase tracking-widest text-orange-200/70">{t("word_detective_component")}</p>
        )}

        <div className={`flex-1 grid gap-3 content-center ${isComponent ? "grid-cols-2" : "grid-cols-2"}`}>
          {options.map((opt, i) => {
            const isLocked = locked === opt;
            return (
              <motion.button
                key={`${i}-${opt}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: isLocked ? 1.05 : 1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => tap(opt, i)}
                disabled={disabled || (locked && !isLocked)}
                className={`btn-tactile rounded-2xl font-display font-bold bg-gradient-to-b from-orange-500 to-amber-700 border-b-4 border-orange-300/60 active:border-b-0 active:translate-y-1 ${
                  isComponent ? "py-10 text-4xl kaiti" : "py-8 text-xl sm:text-2xl kaiti"
                } ${isLocked ? "ring-4 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]" : ""}`}
              >
                {opt}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <span className="text-4xl">🔍</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
