import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import { useGameFeel } from "@/lib/gameFeel";

const BUBBLE_COLORS = [
  "from-sky-400 to-blue-600 border-sky-200",
  "from-emerald-400 to-teal-600 border-emerald-200",
  "from-fuchsia-400 to-purple-600 border-fuchsia-200",
  "from-amber-400 to-orange-600 border-amber-200",
];

import { useLang } from "@/lib/i18n";

/** G1 — Bubble Pop (Fruit-Ninja/bubble-shooter DNA + Candy-Crush combo cascade) */
export default function BubblePopGame({ challenge, onCorrect, onWrong, disabled, combo = 0 }) {
  const { t } = useLang();
  const fx = useGameFeel();
  const [popped, setPopped] = useState(null);
  const startRef = useRef(Date.now());

  const bubbles = useMemo(() => {
    const opts = challenge.options || [];
    return opts.map((opt, i) => ({
      opt,
      id: `${i}-${opt}`,
      color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
      x: 8 + (i * (84 / Math.max(1, opts.length - 1 || 1))) + (Math.random() * 8 - 4),
      y: 18 + (i % 3) * 22 + Math.random() * 10,
      size: 88 + Math.round(Math.random() * 32),
      duration: 3.2 + Math.random() * 2,
      delay: Math.random() * 1.2,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge]);

  const pop = (b) => {
    if (disabled || popped) return;
    const ok = b.opt === challenge.answer;
    const responseMs = Date.now() - startRef.current;
    sfx.click();
    speak(b.opt);
    setPopped({ opt: b.opt, ok });
    if (ok) {
      fx.hit(b.x, b.y, { combo: combo + 1, responseMs, critical: responseMs < 700 });
    } else {
      fx.miss(b.x, b.y);
    }
    setTimeout(() => (ok ? onCorrect() : onWrong()), ok ? 350 : 250);
  };

  return (
    <div
      data-testid="bubble-pop-game"
      className="relative flex-1 min-h-[52vh] w-full rounded-2xl overflow-hidden border-2 border-sky-400/25 bg-gradient-to-b from-sky-950 via-sky-900/50 to-blue-950/90"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.25),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(14,116,144,0.3),transparent_55%)]" />
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={`fizz-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-sky-200/30"
          style={{ left: `${5 + i * 8}%`, bottom: 0 }}
          animate={{ y: [0, -320], opacity: [0.6, 0] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.35, ease: "linear" }}
        />
      ))}

      <p className="absolute top-3 inset-x-0 text-center text-[10px] uppercase tracking-widest text-sky-200/50 pointer-events-none z-10">
        {t("bubble_pop_hint")}
      </p>

      <AnimatePresence>
        {bubbles.map((b) => {
          const isPopped = popped?.opt === b.opt;
          if (isPopped) {
            return (
              <motion.div
                key={b.id}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute flex items-center justify-center z-20"
                style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.size, height: b.size, marginLeft: -(b.size / 2), marginTop: -(b.size / 2) }}
              >
                <span className="text-4xl">{popped.ok ? "💥" : "💨"}</span>
              </motion.div>
            );
          }
          if (popped) return null;
          return (
            <motion.button
              key={b.id}
              type="button"
              data-testid={`bubble-${b.opt}`}
              onClick={() => pop(b)}
              disabled={disabled}
              className={`absolute rounded-full border-2 shadow-lg bg-gradient-to-br ${b.color} flex items-center justify-center font-display font-bold text-white text-center px-2 active:scale-90 touch-manipulation z-10`}
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.size, height: b.size, marginLeft: -(b.size / 2), marginTop: -(b.size / 2) }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [1, 1.06, 1],
                opacity: 1,
                y: [0, -12, 0, 10, 0],
                x: [0, 10, -8, 6, 0],
              }}
              transition={{
                scale: { duration: b.duration, repeat: Infinity, ease: "easeInOut", delay: b.delay },
                y: { duration: b.duration * 1.1, repeat: Infinity, ease: "easeInOut", delay: b.delay },
                x: { duration: b.duration * 1.4, repeat: Infinity, ease: "easeInOut", delay: b.delay },
                opacity: { duration: 0.4 },
              }}
            >
              <span className="text-sm sm:text-base leading-tight drop-shadow">{b.opt}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
