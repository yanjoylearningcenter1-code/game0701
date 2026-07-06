import React from "react";
import { motion } from "framer-motion";
import StrikeArenaInput from "@/components/games/StrikeArenaInput";
import { useLang } from "@/lib/i18n";

/** G17 — build a sentence; keyword glows, typing fires on Ctrl+Enter (no form box). */
export default function SentenceMakingGame({
  challenge,
  typedAnswer,
  setTypedAnswer,
  onSubmit,
  disabled,
  grading,
  feedback,
}) {
  const { t } = useLang();
  const keyword = challenge.keyword || challenge.answer || "";

  return (
    <div data-testid="sentence-making" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <div className="flex-1 flex flex-col justify-center rounded-2xl border-2 border-emerald-400/25 bg-gradient-to-b from-emerald-950/40 via-slate-950/30 to-slate-900/40 p-6">
        <p className="text-center text-xs text-emerald-200/70 mb-4">{t("sentence_making_title")}</p>
        <motion.div
          animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 20px rgba(52,211,153,0.2)", "0 0 40px rgba(52,211,153,0.45)", "0 0 20px rgba(52,211,153,0.2)"] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mx-auto rounded-2xl px-8 py-4 bg-gradient-to-br from-emerald-500/30 to-teal-600/20 border-2 border-emerald-400/50"
        >
          <span className="font-display text-3xl sm:text-4xl font-bold kaiti text-emerald-50">{keyword}</span>
        </motion.div>
      </div>

      <StrikeArenaInput
        value={typedAnswer}
        onChange={setTypedAnswer}
        onSubmit={onSubmit}
        disabled={disabled || grading}
        multiline
        accent="emerald"
        action="compose"
        testId="typing-input"
        minSubmitLength={4}
      />

      {grading && (
        <p className="text-center text-sm text-amber-200 animate-pulse">{t("sentence_grading")}</p>
      )}
      {feedback && (
        <p className="text-sm text-sky-100/90 text-center px-2">{feedback}</p>
      )}
    </div>
  );
}
