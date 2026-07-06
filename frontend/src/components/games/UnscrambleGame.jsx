import React from "react";
import { motion } from "framer-motion";
import GameActionButton from "@/components/games/GameActionButton";

import { useLang } from "@/lib/i18n";

/** G6 — tap tiles to assemble; manual lock when ready. */
export default function UnscrambleGame({ challenge, dragOrder, dragPool, pickTile, unpickTile, onSubmit, onRestore, disabled }) {
  const { t } = useLang();
  const answer = challenge.answer || [];
  const isLetterMode = answer.every((a) => [...String(a)].length <= 1);
  const totalTiles = (challenge.tiles || []).length;
  const ready = dragOrder.length === totalTiles && totalTiles > 0;

  if (isLetterMode) {
    return (
      <div data-testid="drag-area" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
        <div className="flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-amber-950/50 via-slate-950/40 to-slate-900/30 border-2 border-amber-400/25 p-5 sm:p-6">
          <div className="flex-1 min-h-[5rem] flex flex-wrap justify-center items-center gap-2 content-center rounded-xl bg-black/20 border border-amber-400/15 p-4">
            {dragOrder.length === 0 && <span className="text-white/30 text-sm kaiti">{t("unscramble_tap_letters")}</span>}
            {dragOrder.map((t, i) => (
              <motion.button
                key={i + t}
                layout
                initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                whileTap={{ scale: 0.88, rotate: 4 }}
                onClick={() => unpickTile(i)}
                className="w-14 h-16 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-slate-900 font-black text-2xl flex items-center justify-center shadow-[0_5px_0_rgba(180,83,9,0.7)] border border-amber-200 active:shadow-none active:translate-y-1"
                data-testid={`drag-placed-${i}`}
              >
                {t}
              </motion.button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center py-2">
          {dragPool.map((t, i) => (
            <motion.button
              key={i + t}
              layout
              whileTap={{ scale: 0.85, rotate: -6 }}
              onClick={() => pickTile(t, i)}
              className="w-14 h-16 rounded-xl bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900 font-black text-2xl flex items-center justify-center shadow-[0_5px_0_rgba(30,41,59,0.6)] border border-white/40 active:shadow-none active:translate-y-1"
              data-testid={`drag-tile-${i}`}
            >
              {t}
            </motion.button>
          ))}
        </div>
        {challenge.allow_restore && (
          <button type="button" onClick={onRestore} className="text-xs text-amber-200/70 underline w-full text-center active:text-amber-100">{t("unscramble_reshuffle")}</button>
        )}
        <GameActionButton variant="lock" onAction={onSubmit} disabled={disabled} ready={ready} testId="drag-submit-btn" />
      </div>
    );
  }

  return (
    <div data-testid="drag-area" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <div className="flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-violet-950/50 via-slate-950/40 to-slate-900/30 border-2 border-violet-400/25 p-5 sm:p-6">
        <div className="flex-1 min-h-[5rem] flex flex-wrap items-center justify-center gap-2 content-center rounded-xl bg-black/20 border border-violet-400/15 p-4 leading-relaxed">
          {dragOrder.length === 0 && <span className="text-white/30 text-sm kaiti">{t("unscramble_tap_sentence")}</span>}
          {dragOrder.map((t, i) => (
            <motion.button
              key={i + t}
              layout
              initial={{ scale: 0.7, opacity: 0, x: -8 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => unpickTile(i)}
              className="px-4 py-2 rounded-full bg-gradient-to-b from-violet-400 to-purple-600 text-white font-bold text-sm shadow-[0_4px_0_rgba(91,33,182,0.7)] active:shadow-none active:translate-y-0.5"
              data-testid={`drag-placed-${i}`}
            >
              {t}
            </motion.button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-center py-2">
        {dragPool.map((t, i) => (
          <motion.button
            key={i + t}
            layout
            whileTap={{ scale: 0.9 }}
            onClick={() => pickTile(t, i)}
            className="px-4 py-2.5 rounded-full bg-white/10 border border-white/25 text-white font-bold text-sm active:bg-violet-500/25 active:border-violet-300/50"
            data-testid={`drag-tile-${i}`}
          >
            {t}
          </motion.button>
        ))}
      </div>
      {challenge.allow_restore && (
        <button type="button" onClick={onRestore} className="text-xs text-violet-200/70 underline w-full text-center">{t("unscramble_reshuffle")}</button>
      )}
      <GameActionButton variant="lockSentence" onAction={onSubmit} disabled={disabled} ready={ready} testId="drag-submit-btn" />
    </div>
  );
}
