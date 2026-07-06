import React, { useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import { useLang } from "@/lib/i18n";
import { useGameFeel } from "@/lib/gameFeel";

const THEMES = {
  memory: {
    back: "from-violet-700 to-fuchsia-800 border-violet-300/50",
    front: "from-violet-600/30 to-fuchsia-600/20 border-violet-400/40",
    opt: "from-violet-500 to-fuchsia-700 border-violet-300/50",
    accent: "text-violet-200",
  },
  synonym: {
    back: "from-teal-700 to-cyan-800 border-teal-300/50",
    front: "from-teal-600/30 to-cyan-600/20 border-teal-400/40",
    opt: "from-teal-500 to-cyan-700 border-teal-300/50",
    accent: "text-teal-200",
  },
  flashcard: {
    back: "from-amber-600 to-orange-800 border-amber-300/50",
    front: "from-amber-500/30 to-orange-600/20 border-amber-400/40",
    opt: "from-amber-500 to-orange-700 border-amber-300/50",
    accent: "text-amber-200",
  },
};

const FLIP_LABEL_KEYS = { memory: "flip_label_memory", synonym: "flip_label_synonym", flashcard: "flip_label_flashcard" };

/** G2 / G19 / G16 — flip-card interaction. */
export default function MemoryFlipGame({ challenge, onTap, disabled, variant = "memory", title, combo = 0 }) {
  const { t } = useLang();
  const fx = useGameFeel();
  const [revealed, setRevealed] = useState(false);
  const theme = THEMES[variant] || THEMES.memory;
  const front = challenge.pair_front || challenge.front || "🔊 Listen";
  const heading = title || t(FLIP_LABEL_KEYS[variant] || FLIP_LABEL_KEYS.memory);

  const flip = () => {
    if (revealed) {
      if (variant === "flashcard" && challenge.answer) {
        sfx.click();
        speak(challenge.answer);
      }
      return;
    }
    sfx.click();
    setRevealed(true);
    if (variant === "flashcard" && challenge.answer) {
      setTimeout(() => speak(challenge.answer), 300);
    }
  };

  return (
    <div data-testid="memory-flip-game" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <div className={`text-center text-sm font-display font-bold ${theme.accent}`}>{heading}</div>
      <div className="flex-1 flex items-center justify-center" style={{ perspective: 1200 }}>
        <motion.div
          data-testid="flip-card"
          role="button"
          tabIndex={0}
          onClick={flip}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 180, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
          className={`relative min-h-[150px] rounded-3xl mx-auto max-w-xs ${!revealed ? "cursor-pointer" : ""}`}
        >
          <div
            style={{ backfaceVisibility: "hidden" }}
            className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${theme.back} border-2 flex flex-col items-center justify-center bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[length:14px_14px]`}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="text-5xl mb-1"
            >
              🃏
            </motion.div>
            <div className="text-xs uppercase tracking-widest text-white/70">{t("flip_tap")}</div>
          </div>
          <div
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${theme.front} border-2 flex flex-col items-center justify-center px-4 text-center text-white`}
          >
            <div className={`text-xs uppercase tracking-widest ${theme.accent} mb-2`}>
              {variant === "flashcard" ? t("flip_meaning") : t("flip_match")}
            </div>
            <div className="font-display text-2xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">{front}</div>
          </div>
        </motion.div>
      </div>

      {revealed && (
        <div className="grid grid-cols-2 gap-3">
          {challenge.options?.map((opt, i) => (
            <motion.button
              key={`mf-${i}-${opt}`}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.06, type: "spring" }}
              whileTap={{ scale: 0.94 }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
                const cy = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
                const isCorrect = opt === challenge.answer;
                if (isCorrect) fx.hit(cx, cy, { combo: combo + 1, responseMs: 900 });
                else fx.miss(cx, cy);
                onTap(opt);
              }}
              disabled={disabled}
              className={`btn-tactile rounded-2xl p-4 font-display text-lg font-bold bg-gradient-to-b ${theme.opt} border-2`}
            >
              {opt}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
