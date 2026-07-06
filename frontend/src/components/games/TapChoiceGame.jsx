import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";
import { useGameFeel } from "@/lib/gameFeel";

/**
 * TapChoiceGame — one tap on a floating option = your answer.
 * Options drift at random positions (not stacked in lanes).
 */

const THEME_STYLE = {
  G3: { arena: "from-rose-950/60 via-slate-950/80 to-slate-900 border-rose-400/30", icon: "🎯", labelKey: "shooter_label_g3", btn: "from-sky-500 to-blue-700 border-sky-300/60" },
  G10: { arena: "from-emerald-950/60 via-slate-950/80 to-slate-900 border-emerald-400/30", icon: "🔍", labelKey: "shooter_label_g10", btn: "from-emerald-600 to-teal-800 border-emerald-300/60", mono: true },
  G11: { arena: "from-amber-950/60 via-slate-950/80 to-slate-900 border-amber-400/30", icon: "📖", labelKey: "shooter_label_g11", btn: "from-amber-500 to-orange-700 border-amber-300/60" },
  G13: { arena: "from-indigo-950/60 via-slate-950/80 to-slate-900 border-indigo-400/30", icon: "📚", labelKey: "shooter_label_g13", btn: "from-indigo-500 to-violet-700 border-indigo-300/60" },
  idiom_repair: { arena: "from-red-950/60 via-slate-950/80 to-slate-900 border-red-400/30", icon: "🏮", labelKey: "shooter_label_idiom", btn: "from-red-600 to-rose-800 border-red-300/60" },
  stroke_order: { arena: "from-slate-800/60 via-slate-950/80 to-slate-900 border-slate-400/30", icon: "🖌️", labelKey: "shooter_label_stroke", btn: "from-slate-600 to-slate-800 border-slate-300/50", mono: true },
  default: { arena: "from-sky-950/60 via-slate-950/80 to-slate-900 border-sky-400/30", icon: "🎯", labelKey: "shooter_label_default", btn: "from-sky-500 to-blue-700 border-sky-300/60" },
};

function layoutOptions(options, seed) {
  const n = options.length;
  const cols = n <= 2 ? n : 2;
  const rows = Math.ceil(n / cols);
  return options.map((opt, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jitter = ((seed + i * 17) % 13) - 6;
    const x = ((col + 0.5) / cols) * 72 + 14 + jitter * 0.4;
    const y = ((row + 0.5) / rows) * 58 + 14 + (((seed + i * 31) % 11) - 5) * 0.5;
    return { opt, x: Math.max(8, Math.min(88, x)), y: Math.max(10, Math.min(82, y)), i };
  });
}

export default function TapChoiceGame({ challenge, onTap, disabled, variant, combo = 0 }) {
  const { t } = useLang();
  const fx = useGameFeel();
  const theme = THEME_STYLE[variant] || THEME_STYLE.default;
  const label = t(theme.labelKey);
  const [locked, setLocked] = useState(null);
  const [showReference, setShowReference] = useState(false);
  const isTypoHunter = variant === "G10" && challenge.reference_sentence;
  const challengeStartRef = useRef(Date.now());

  const targets = useMemo(() => {
    const opts = challenge.options || [];
    const seed = [...String(challenge.answer || "")].reduce((a, c) => a + c.charCodeAt(0), 0);
    return layoutOptions(opts, seed);
  }, [challenge]);

  useEffect(() => {
    setLocked(null);
    challengeStartRef.current = Date.now();
  }, [challenge]);

  const pick = (opt, clientX, clientY) => {
    if (disabled || locked) return;
    sfx.click();
    const responseMs = Date.now() - challengeStartRef.current;
    const isCorrect = opt === challenge.answer;
    const rect = document.querySelector("[data-testid='tap-options']")?.getBoundingClientRect();
    const x = rect ? ((clientX - rect.left) / rect.width) * 100 : 50;
    const y = rect ? ((clientY - rect.top) / rect.height) * 100 : 50;
    if (isCorrect) {
      fx.hit(x, y, { combo: combo + 1, responseMs, critical: responseMs < 900 });
    } else {
      fx.miss(x, y);
    }
    setLocked(opt);
    setTimeout(() => onTap(opt), 150);
  };

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

      {showReference && isTypoHunter && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur flex items-center justify-center px-6" onClick={() => setShowReference(false)}>
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-emerald-400/30 p-6 space-y-4" onClick={(e) => e.stopPropagation()} data-testid="typo-reference-modal">
            <h4 className="font-display text-lg font-bold text-emerald-100">{t("g10_reference_title")}</h4>
            <p className="text-base leading-relaxed text-white/90 text-center py-3 px-2 rounded-2xl bg-black/30">{renderReference()}</p>
            <button type="button" onClick={() => setShowReference(false)} className="w-full rounded-xl py-3 font-bold bg-emerald-500 text-slate-900">{t("ok")}</button>
          </div>
        </div>
      )}

      <div
        data-testid="tap-options"
        className={`relative flex-1 min-h-[44vh] w-full rounded-2xl overflow-hidden border-2 bg-gradient-to-b ${theme.arena}`}
      >
        <p className="absolute top-2 inset-x-0 text-center text-[10px] text-white/45 pointer-events-none z-10">
          {theme.icon} {label} · {t("tap_pick_hint")}
        </p>

        {targets.map(({ opt, x, y, i }) => {
          const isLocked = locked === opt;
          const dimmed = locked && !isLocked;
          return (
            <motion.button
              key={`${opt}-${i}`}
              type="button"
              data-testid={`tap-option-${i}`}
              disabled={disabled || !!locked}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isLocked ? 1.08 : 1,
                opacity: dimmed ? 0.35 : 1,
                y: [0, -6, 0, 5, 0],
                x: [0, 4, -3, 2, 0],
              }}
              transition={{
                y: { duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 5 + i * 0.2, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 0.2 },
              }}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={(e) => pick(opt, e.clientX, e.clientY)}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 min-w-[5.5rem] max-w-[85%] px-4 py-3 rounded-xl border-b-4 font-display text-base sm:text-lg font-bold bg-gradient-to-b ${theme.btn} ${theme.mono ? "font-mono" : ""} text-white shadow-lg active:scale-95 ${isLocked ? "ring-4 ring-white/50" : ""}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
