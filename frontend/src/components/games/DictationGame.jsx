import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import StrikeArenaInput from "@/components/games/StrikeArenaInput";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

/** G9 — listen + rhythm strike typing. No text box, no Check button. */
export default function DictationGame({
  challenge,
  typedAnswer,
  setTypedAnswer,
  onSubmit,
  disabled,
  onPlayWord,
  onPlaySentence,
  status,
  timeLimitSec,
  onTimeUp,
}) {
  const { t } = useLang();
  const answer = challenge.answer || "";
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? null);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!timeLimitSec) {
      setTimeLeft(null);
      return undefined;
    }
    expiredRef.current = false;
    setTimeLeft(timeLimitSec);
    if (disabled) return undefined;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onTimeUp?.();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeLimitSec, challenge?.unit_id, disabled, onTimeUp]);

  const urgent = timeLeft != null && timeLeft <= 10;

  return (
    <div data-testid="dictation-game" className="flex flex-col flex-1 min-h-[52vh] w-full">
      {timeLeft != null && (
        <div className={`text-center font-display text-3xl font-bold tabular-nums mb-3 ${urgent ? "text-rose-400 animate-pulse" : "text-amber-300"}`} data-testid="dictation-timer">
          ⏱ {timeLeft}s
        </div>
      )}

      <div className="flex-1 flex flex-col rounded-2xl border-2 border-cyan-400/25 bg-gradient-to-b from-cyan-950/40 via-slate-950/30 to-slate-900/40 p-4 sm:p-6 gap-5">
        <div className="flex justify-center gap-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onPlayWord}
            disabled={disabled}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-700 border-b-4 border-cyan-900 shadow-lg flex flex-col items-center justify-center active:border-b-0 active:translate-y-1"
          >
            <span className="text-3xl">🔊</span>
            <span className="text-xs font-bold mt-1">{t("dictation_listen_word")}</span>
          </motion.button>
          {onPlaySentence && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onPlaySentence}
              disabled={disabled}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-teal-500 to-teal-900 border-b-4 border-teal-950 shadow-lg flex flex-col items-center justify-center active:border-b-0 active:translate-y-1"
            >
              <span className="text-3xl">🎧</span>
              <span className="text-xs font-bold mt-1">{t("dictation_listen_sentence")}</span>
            </motion.button>
          )}
        </div>

        <StrikeArenaInput
          value={typedAnswer}
          onChange={setTypedAnswer}
          onSubmit={() => { sfx.click(); onSubmit(); }}
          disabled={disabled}
          slotCount={[...answer].length}
          status={status}
          accent="cyan"
          action="strike"
        />
      </div>
    </div>
  );
}
