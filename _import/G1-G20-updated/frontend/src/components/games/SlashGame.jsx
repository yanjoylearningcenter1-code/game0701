import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import { useGameFeel } from "@/lib/gameFeel";

let _uid = 0;

import { useLang } from "@/lib/i18n";

/** G7 — slash arena */
export default function SlashGame({ challenge, onCorrect, onWrong, disabled }) {
  const { t } = useLang();
  const fx = useGameFeel();
  const roundSec = challenge.round_duration_sec ?? 20;
  const hitsRequired = challenge.hits_required ?? 8;
  const spawnMs = challenge.spawn_ms ?? 900;
  const fallMs = challenge.fall_duration_ms ?? 4200;
  const answer = challenge.answer || "";
  const pool = challenge.falling_options || challenge.falling_words?.map((w) => w.text) || [answer];

  const [timeLeft, setTimeLeft] = useState(roundSec);
  const [hits, setHits] = useState(0);
  const [live, setLive] = useState([]);
  const [fled, setFled] = useState(() => new Set());
  const [slashFx, setSlashFx] = useState(null);
  const doneRef = useRef(false);
  const hitsRef = useRef(0);

  const finish = useCallback(
    (won) => {
      if (doneRef.current || disabled) return;
      doneRef.current = true;
      if (won ?? hitsRef.current >= hitsRequired) onCorrect();
      else onWrong();
    },
    [disabled, hitsRequired, onCorrect, onWrong],
  );

  useEffect(() => {
    if (disabled || challenge.auto_play_audio === false) return undefined;
    const t = setTimeout(() => speak(answer), 500);
    return () => clearTimeout(t);
  }, [answer, challenge.auto_play_audio, disabled]);

  useEffect(() => {
    doneRef.current = false;
    hitsRef.current = 0;
    setHits(0);
    setTimeLeft(roundSec);
    setLive([]);
    setFled(new Set());
    if (disabled) return undefined;

    const clock = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(clock);
          finish(hitsRef.current >= hitsRequired);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(clock);
  }, [challenge, disabled, finish, hitsRequired, roundSec]);

  useEffect(() => {
    if (disabled || doneRef.current) return undefined;

    const pickWord = () => {
      const roll = Math.random();
      return roll < 0.4 ? answer : pool[Math.floor(Math.random() * pool.length)] || answer;
    };

    const spawn = () => {
      if (doneRef.current) return;
      const id = `w-${++_uid}`;
      const text = pickWord();
      const x = 8 + Math.floor(Math.random() * 76);
      setLive((prev) => [...prev.slice(-9), { id, text, x }]);
    };

    spawn();
    const spawner = setInterval(spawn, spawnMs);
    return () => clearInterval(spawner);
  }, [answer, disabled, pool, spawnMs]);

  const flee = (id) => {
    if (disabled || doneRef.current || fled.has(id)) return;
    setFled((prev) => new Set(prev).add(id));
    setTimeout(() => setLive((prev) => prev.filter((w) => w.id !== id)), 280);
  };

  const slash = (word) => {
    if (disabled || doneRef.current || fled.has(word.id)) return;
    if (word.text === answer) {
      sfx.correct?.() || sfx.click();
      setSlashFx(word.id);
      setTimeout(() => setSlashFx(null), 200);
      hitsRef.current += 1;
      setHits(hitsRef.current);
      fx.hit(word.x, 55, { combo: hitsRef.current, responseMs: 800, critical: hitsRef.current >= 5 && hitsRef.current % 3 === 0 });
      setLive((prev) => prev.filter((w) => w.id !== word.id));
      if (hitsRef.current >= hitsRequired) finish(true);
    } else {
      sfx.wrong?.();
      fx.miss(word.x, 55);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-[52vh] w-full space-y-3" data-testid="slash-game">
      <div className="flex items-center justify-between px-1">
        <span className="font-display text-2xl font-bold tabular-nums text-rose-300" data-testid="slash-timer">
          ⏱ {timeLeft}s
        </span>
        <span className="text-sm text-emerald-300/90 font-bold">
          ⚔️ {hits}/{hitsRequired}
        </span>
      </div>
      <div className="relative flex-1 min-h-[44vh] rounded-2xl bg-gradient-to-b from-slate-900/90 via-rose-950/50 to-rose-900/40 border-2 border-rose-400/35 overflow-hidden isolate">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.15),transparent_55%)] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-rose-500/30 to-transparent border-t border-rose-400/30 z-0" />
        <AnimatePresence>
          {live.map((w) => {
            if (fled.has(w.id)) return null;
            const slashed = slashFx === w.id;
            return (
              <motion.button
                key={w.id}
                type="button"
                initial={{ y: -48, opacity: 0, scale: 0.9 }}
                animate={{ y: slashed ? 120 : 280, opacity: slashed ? 0 : 1, scale: slashed ? 1.3 : 1, left: `${w.x}%` }}
                exit={{ scale: 0.2, opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: slashed ? 0.15 : fallMs / 1000, ease: slashed ? "easeOut" : "linear" }}
                onMouseEnter={() => flee(w.id)}
                onPointerEnter={() => flee(w.id)}
                onClick={() => slash(w)}
                disabled={disabled}
                style={{ left: `${w.x}%`, x: "-50%" }}
                className="absolute top-0 z-10 w-fit max-w-[80%] px-3 py-2.5 rounded-xl font-display text-sm sm:text-base font-bold bg-gradient-to-b from-rose-400 to-red-700 border-b-4 border-rose-200 shadow-lg touch-manipulation active:scale-95 active:border-b-0 active:translate-y-1"
                data-testid="slash-target"
              >
                {slashed ? "⚔️" : w.text}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      <p className="text-center text-[11px] text-rose-200/80 px-2">
        {t("slash_hint", { n: hitsRequired })}
      </p>
    </div>
  );
}
