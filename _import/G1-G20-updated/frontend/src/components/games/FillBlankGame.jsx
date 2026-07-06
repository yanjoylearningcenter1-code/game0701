import React from "react";
import { motion } from "framer-motion";
import StrikeArenaInput from "@/components/games/StrikeArenaInput";
import { sfx } from "@/lib/audio";

/** G4 / G5 / G18 — strike letters into blanks; manual gun fire only. */
export default function FillBlankGame({ challenge, variant, typedAnswer, setTypedAnswer, onSubmit, disabled }) {
  const masked = challenge.masked || challenge.prompt || "";
  const answer = challenge.answer || "";

  const renderMaskWithTyping = (accent, blankClass, fixedClass) => {
    let ti = 0;
    const chars = [...masked];
    return (
      <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
        {chars.map((ch, i) => {
          const isBlank = ch === "_" || ch === "＿";
          if (isBlank) {
            const typed = typedAnswer[ti++];
            return (
              <motion.div
                key={`${i}-b`}
                animate={typed ? { scale: [1.2, 1] } : { scale: 1 }}
                className={`w-10 h-12 sm:w-11 sm:h-14 rounded-xl flex items-center justify-center font-display text-xl sm:text-2xl font-bold kaiti ${
                  typed
                    ? "bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-orange-200 text-slate-900 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                    : blankClass
                }`}
              >
                {typed || "?"}
              </motion.div>
            );
          }
          return (
            <div key={`${i}-f`} className={`w-10 h-12 sm:w-11 sm:h-14 rounded-xl flex items-center justify-center font-display text-xl sm:text-2xl font-bold ${fixedClass}`}>
              {ch}
            </div>
          );
        })}
      </div>
    );
  };

  const blankCount = [...masked].filter((c) => c === "_" || c === "＿").length;
  const slotTarget = challenge.missing_part
    ? [...challenge.missing_part].length
    : answer
      ? [...answer].length
      : blankCount || 1;

  if (variant === "letters") {
    return (
      <div data-testid="missing-letter-area" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
        <div className="flex-1 flex flex-col justify-center rounded-2xl bg-gradient-to-b from-emerald-950/50 via-slate-950/40 to-slate-900/30 border-2 border-emerald-400/25 p-6 sm:p-8">
          {renderMaskWithTyping(
            "emerald",
            "bg-emerald-400/25 border-2 border-dashed border-emerald-300/70 text-emerald-100 animate-pulse",
            "bg-white/10 border border-white/20 text-white"
          )}
        </div>
        <StrikeArenaInput
          value={typedAnswer}
          onChange={setTypedAnswer}
          onSubmit={() => { sfx.click(); onSubmit(); }}
          disabled={disabled}
          slotCount={slotTarget}
          accent="emerald"
          action="stamp"
          testId="missing-letter-input"
          submitTestId="missing-letter-submit-btn"
        />
      </div>
    );
  }

  if (variant === "crossword") {
    return (
      <div data-testid="crossword-area" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
        <div className="flex-1 flex flex-col justify-center rounded-2xl bg-gradient-to-b from-indigo-950/50 via-slate-950/40 to-slate-900/30 border-2 border-indigo-400/25 p-6">
          {renderMaskWithTyping(
            "indigo",
            "bg-indigo-400/30 border-2 border-indigo-300/60 text-indigo-100 animate-pulse",
            "bg-slate-900/70 border-2 border-indigo-300/25 text-white"
          )}
        </div>
        <StrikeArenaInput
          value={typedAnswer}
          onChange={setTypedAnswer}
          onSubmit={() => { sfx.click(); onSubmit(); }}
          disabled={disabled}
          slotCount={slotTarget}
          accent="indigo"
          action="puzzle"
          testId="missing-letter-input"
          submitTestId="missing-letter-submit-btn"
          minSubmitLength={1}
        />
      </div>
    );
  }

  return (
    <div data-testid="missing-letter-area" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <div className="flex-1 flex flex-col justify-center rounded-2xl bg-gradient-to-b from-sky-950/50 via-slate-950/40 to-slate-900/30 border-2 border-sky-400/25 p-6 sm:p-8">
        <p className="text-center font-display text-xl sm:text-2xl leading-relaxed text-sky-50 px-2">
          {masked.split("___").map((part, i, arr) => (
            <React.Fragment key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="inline-block mx-1 px-3 min-w-[4rem] border-b-4 border-dashed border-sky-300 text-sky-300 animate-pulse align-bottom">
                  {typedAnswer || "\u00A0"}
                </span>
              )}
            </React.Fragment>
          ))}
        </p>
      </div>
      <StrikeArenaInput
        value={typedAnswer}
        onChange={setTypedAnswer}
        onSubmit={() => { sfx.click(); onSubmit(); }}
        disabled={disabled}
        accent="sky"
        action="ink"
        testId="missing-letter-input"
        submitTestId="missing-letter-submit-btn"
      />
    </div>
  );
}
