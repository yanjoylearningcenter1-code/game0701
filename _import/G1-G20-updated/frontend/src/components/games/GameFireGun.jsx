import React from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

/** Shooter-only — G3 / G10 / G11 lane games. */
export default function GameFireGun({ onFire, disabled, ready, fired, testId = "tap-fire-btn" }) {
  const { t } = useLang();
  const canFire = ready && !disabled && !fired;

  return (
    <div className="flex flex-col items-center gap-1 pt-1">
      <motion.button type="button" data-testid={testId}
        onClick={() => { if (canFire) { sfx.click(); onFire?.(); } }}
        disabled={!canFire} whileTap={canFire ? { scale: 0.94, y: 3 } : {}}
        className="relative h-20 w-full max-w-xs disabled:opacity-40 touch-manipulation"
        aria-label={t("shooter_fire")}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[88%] h-[72%]">
          <div className="absolute bottom-0 left-[18%] w-[64%] h-[55%] rounded-lg bg-gradient-to-b from-slate-500 to-slate-800 border-2 border-slate-400/60 shadow-[0_4px_0_#1e293b]" />
          <div className="absolute bottom-[48%] left-[8%] w-[28%] h-[38%] rounded-md bg-gradient-to-b from-slate-600 to-slate-900 border border-slate-500/50" />
          <div className="absolute bottom-[52%] right-[12%] w-[22%] h-[28%] rounded bg-gradient-to-b from-amber-500 to-amber-700 border border-amber-300/50" />
          <div className="absolute top-0 left-[38%] w-[24%] h-[45%] rounded-t-md bg-gradient-to-b from-slate-400 to-slate-700 border-x border-t border-slate-300/40" />
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-10 rounded-full border-2 border-rose-500/50 bg-rose-950/40 flex items-end justify-center pb-1">
          <span className={`text-xs font-display font-bold ${fired ? "text-emerald-300" : canFire ? "text-amber-300" : "text-white/50"}`}>
            {fired ? t("shooter_hit") : canFire ? t("shooter_fire") : t("shooter_aiming")}
          </span>
        </div>
      </motion.button>
    </div>
  );
}
