import React from "react";
import { useLang } from "@/lib/i18n";
import StrikeArenaInput from "@/components/games/StrikeArenaInput";
import { sfx } from "@/lib/audio";

/** Full passage recall — flowing strike chars, Ctrl+Enter to fire (no textarea). */
export default function FullRecallGame({
  typedAnswer,
  setTypedAnswer,
  onSubmit,
  disabled,
  onFirstInput,
  similarityResult,
}) {
  const { t } = useLang();
  const handleChange = (v) => {
    if (v && onFirstInput) onFirstInput();
    setTypedAnswer(v);
  };

  return (
    <div data-testid="full-recall-area" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <div className="flex-1 flex flex-col justify-center rounded-2xl border-2 border-amber-400/25 bg-gradient-to-b from-amber-950/40 via-slate-950/30 to-slate-900/40 p-4">
        <p className="text-center text-xs text-amber-200/70 mb-2">{t("full_recall_title")}</p>
        <StrikeArenaInput
          value={typedAnswer}
          onChange={handleChange}
          onSubmit={() => { sfx.click(); onSubmit(); }}
          disabled={disabled}
          multiline
          accent="amber"
          action="scroll"
          testId="typing-input"
          submitTestId="typing-submit-btn"
          minSubmitLength={2}
        />
      </div>
      {similarityResult !== null && (
        <div className="text-center text-sm text-sky-200/70" data-testid="similarity-result">
          {t("full_recall_similarity", { n: similarityResult })}
        </div>
      )}
    </div>
  );
}
