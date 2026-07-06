import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";

/**
 * StreakSaveModal — the "spend 1 💎 to rescue your combo" prompt.
 *
 * DNA: Candy Crush "+5 moves for 99¢" prompt, Duolingo "Streak Freeze",
 * Cookie Run revival gem. Auto-dismisses after `windowMs` so it never blocks.
 *
 * Props:
 *   open         — bool
 *   combo        — the combo about to be lost
 *   diamonds     — current diamond balance
 *   onSave       — user chose to spend 1💎 to keep combo
 *   onLetGo      — user declined / timer expired
 *   windowMs     — how long the user has to decide (default 2500ms)
 */
export default function StreakSaveModal({ open, combo, diamonds, onSave, onLetGo, windowMs = 2500 }) {
  const [remainingMs, setRemainingMs] = useState(windowMs);

  useEffect(() => {
    if (!open) return undefined;
    setRemainingMs(windowMs);
    sfx.wrong?.();
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const remain = Math.max(0, windowMs - elapsed);
      setRemainingMs(remain);
      if (remain === 0) {
        clearInterval(iv);
        onLetGo?.();
      }
    }, 40);
    return () => clearInterval(iv);
  }, [open, windowMs, onLetGo]);

  const canAfford = diamonds >= 1;
  const pct = (remainingMs / windowMs) * 100;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-center justify-center px-6 bg-slate-950/70 backdrop-blur-sm"
          data-testid="streak-save-modal"
        >
          <motion.div
            initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-500 via-amber-500 to-yellow-400 p-1 shadow-[0_0_48px_rgba(251,191,36,0.5)]"
          >
            <div className="rounded-3xl bg-slate-950/90 border border-white/10 p-6 text-center">
              <motion.div
                animate={{ rotate: [-5, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="text-5xl mb-2"
              >🔥</motion.div>
              <div className="font-display text-2xl font-bold text-white mb-1">
                Streak in danger!
              </div>
              <div className="text-sm text-white/70 mb-4">
                Your <span className="font-bold text-rose-300">x{combo}</span> combo is about to break. Rescue it?
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  data-testid="streak-let-go-btn"
                  onClick={() => { sfx.click(); onLetGo?.(); }}
                  className="rounded-2xl py-3 font-display font-bold border-2 border-white/15 text-white/80 hover:bg-white/5 active:scale-95 transition"
                >
                  Let it go
                </button>
                <button
                  data-testid="streak-save-btn"
                  disabled={!canAfford}
                  onClick={() => { sfx.click(); onSave?.(); }}
                  className={`rounded-2xl py-3 font-display font-bold text-slate-900 active:scale-95 transition ${
                    canAfford
                      ? "bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_4px_0_rgba(180,83,9,0.7)]"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  💎 1 Rescue
                </button>
              </div>

              {/* Countdown ring */}
              <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.04, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-rose-400 to-amber-300"
                />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mt-2">
                {canAfford ? `You have 💎 ${diamonds}` : "💎 0 — earn more from combos"}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
