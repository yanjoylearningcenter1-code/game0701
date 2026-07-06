import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

/** G20 / G20-zh — rescue mission: guess chars before the gate bars close. */
export default function RescueGame({ challenge, onCorrect, onWrong, disabled }) {
  const { t } = useLang();
  const answer = challenge.answer || "";
  const isZh = challenge.is_zh || /[\u4e00-\u9fff]/.test(answer);
  const maxLives = challenge.lives ?? 6;
  const timeLimit = challenge.time_limit_sec ?? 45;

  const units = useMemo(() => {
    if (isZh) return [...answer].filter((c) => /[\u4e00-\u9fff]/.test(c));
    return answer.replace(/ /g, "").split("").filter((c) => /[a-zA-Z]/.test(c));
  }, [answer, isZh]);

  const [revealed, setRevealed] = useState(() => new Set());
  const [guessed, setGuessed] = useState(() => new Set());
  const [lives, setLives] = useState(maxLives);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [done, setDone] = useState(false);

  const pool = challenge.letter_pool || [];

  const display = units.map((ch, i) => (revealed.has(i) ? ch : "＿")).join(isZh ? "" : " ");

  useEffect(() => {
    if (disabled || done) return;
    if (timeLeft <= 0) {
      setDone(true);
      onWrong();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, disabled, done, onWrong]);

  const pick = (letter) => {
    if (disabled || done || guessed.has(letter)) return;
    sfx.click();
    const nextGuessed = new Set(guessed);
    nextGuessed.add(letter);
    setGuessed(nextGuessed);

    const indices = [];
    units.forEach((ch, i) => {
      if (ch.toLowerCase() === letter.toLowerCase() || ch === letter) indices.push(i);
    });

    if (indices.length === 0) {
      sfx.wrong?.();
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        setDone(true);
        onWrong();
      }
      return;
    }

    const nextRev = new Set(revealed);
    indices.forEach((i) => nextRev.add(i));
    setRevealed(nextRev);

    const allRevealed = units.every((_, i) => nextRev.has(i));
    if (allRevealed) {
      setDone(true);
      sfx.correct?.();
      setTimeout(() => onCorrect(), 400);
    }
  };

  const gatePct = Math.max(0, (timeLeft / timeLimit) * 100);

  return (
    <div data-testid="rescue-area" className="space-y-4">
      <div className="text-center">
        <div className="font-display text-4xl font-bold tabular-nums text-amber-300 mb-2" data-testid="rescue-countdown">
          ⏱ {timeLeft}s
        </div>
        <div className="relative h-3 rounded-xl bg-slate-900/80 border border-amber-500/30 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-rose-600"
            style={{ width: `${gatePct}%` }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
        </div>
      </div>

      <div className="flex justify-center gap-1">
        {Array.from({ length: maxLives }, (_, i) => (
          <motion.span
            key={i}
            animate={{ opacity: i < lives ? 1 : 0.15, scale: i < lives ? 1 : 0.8 }}
            className="text-2xl"
          >
            {i < lives ? "🚧" : "💥"}
          </motion.span>
        ))}
      </div>

      <div className="text-center text-5xl">🦸‍♂️</div>
      <div className="text-center font-display text-2xl sm:text-3xl tracking-widest text-amber-100 min-h-[2.5rem] kaiti">
        {display}
      </div>
      <p className="text-center text-xs text-white/50">
        {t("rescue_lives", { lives, found: revealed.size, total: units.length })}
      </p>
      <p className="text-center text-[10px] text-white/40">{t("rescue_pick")}</p>
      <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
        {pool.map((letter) => (
          <motion.button
            key={letter}
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={disabled || done || guessed.has(letter)}
            onClick={() => pick(letter)}
            className={`w-10 h-10 rounded-xl font-bold text-sm kaiti ${
              guessed.has(letter)
                ? "bg-white/10 text-white/30"
                : "bg-gradient-to-b from-amber-400 to-orange-600 text-slate-900 shadow-md"
            }`}
          >
            {letter}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
