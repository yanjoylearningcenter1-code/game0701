import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

// Non-scored teaching aid (spec Section B.3 / D.6): shows a simplified,
// numbered stroke-order sequence for a Chinese character during the
// learning stage. This is deliberately NOT real anatomically-accurate
// stroke-path animation (that needs per-character stroke-path data, e.g.
// via the hanzi-writer library + a CDN of stroke data) — it's a lightweight
// numbered-sequence guide that needs no extra dependency or network call.
// Grading/pass-fail always stays on the typed-answer comparison elsewhere;
// this component never reports back a score.
export default function StrokeOrderTeach({ character, strokeCount = 8, onClose }) {
  const { t } = useLang();
  const steps = useMemo(() => Array.from({ length: Math.max(1, Math.min(strokeCount, 12)) }, (_, i) => i + 1), [strokeCount]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    const timer = setInterval(() => {
      setActive((a) => (a + 1 >= steps.length ? 0 : a + 1));
    }, 700);
    return () => clearInterval(timer);
  }, [steps.length, character]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center px-6"
      data-testid="stroke-order-teach-modal"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white/10 border border-white/20 p-6 text-center text-white"
      >
        <div className="text-xs uppercase tracking-widest text-sky-200/70 mb-1">{t("stroke_teach_title")}</div>
        <div className="text-[10px] text-white/40 mb-4">{t("stroke_teach_sub")}</div>

        <div className="font-display text-8xl mb-6">{character}</div>

        <div className="flex justify-center gap-2 flex-wrap mb-6">
          {steps.map((n, i) => (
            <motion.div
              key={n}
              animate={{
                scale: i === active ? 1.25 : 1,
                opacity: i <= active ? 1 : 0.3,
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                i === active ? "bg-amber-400 text-slate-900 border-amber-200" : "bg-white/10 border-white/20"
              }`}
            >
              {n}
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-sky-100/60 mb-6">
          {t("stroke_teach_body", { n: steps.length })}
        </p>

        <button
          data-testid="close-stroke-teach-btn"
          onClick={onClose}
          className="w-full rounded-2xl py-3 font-display font-bold bg-white/15 hover:bg-white/25"
        >
          {t("stroke_teach_close")}
        </button>
      </motion.div>
    </motion.div>
  );
}
