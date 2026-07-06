import React, { useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import { useLang } from "@/lib/i18n";

/** G13 — show context before/after blank; player picks the missing middle word. */
export default function ClozeFillGame({ challenge, onTap, disabled }) {
  const { t, lang } = useLang();
  const [status, setStatus] = useState("idle");
  const [locked, setLocked] = useState(null);
  const before = challenge.context_before ?? "";
  const after = challenge.context_after ?? "";
  const hasSplit = before || after;
  const sentence = challenge.sentence || challenge.prompt || "";
  const blankWord = lang === "zh-HK" ? t("cloze_speak_blank") : "blank";

  const speakQuestion = () => {
    sfx.click();
    const full = hasSplit ? `${before}${challenge.answer || blankWord}${after}` : sentence.replace(/___+/g, blankWord);
    speak(full);
  };

  const pick = (opt) => {
    if (disabled || status === "correct" || locked) return;
    sfx.click();
    setLocked(opt);
    if (opt === challenge.answer) {
      setStatus("correct");
      const filled = hasSplit ? `${before}${opt}${after}` : sentence.replace(/___+/g, opt);
      speak(`${t("cloze_correct")} ${filled}`);
      setTimeout(() => onTap(opt), 500);
    } else {
      setStatus("wrong");
      sfx.wrong?.();
      speak(t("cloze_wrong"));
      setTimeout(() => { setStatus("idle"); setLocked(null); }, 900);
    }
  };

  const parts = sentence.split(/___+/);

  return (
    <div data-testid="cloze-fill-game" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <div className="flex-1 flex flex-col justify-center rounded-2xl bg-gradient-to-b from-sky-950/50 via-slate-950/40 to-slate-900/30 border-2 border-sky-400/30 p-6 text-center relative">
        {hasSplit ? (
          <p className="text-xl sm:text-2xl leading-relaxed kaiti text-sky-50">
            <span>{before}</span>
            <motion.span
              animate={status === "correct" ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              className={`inline-block min-w-[4rem] border-b-4 mx-1 px-2 align-bottom ${
                status === "correct" ? "border-emerald-400 text-emerald-300" : "border-sky-400 text-sky-300 animate-pulse"
              }`}
            >
              {status === "correct" ? challenge.answer : locked || "___"}
            </motion.span>
            <span>{after}</span>
          </p>
        ) : (
          <p className="text-xl sm:text-2xl leading-relaxed kaiti text-sky-50">
            {parts.map((part, i) => (
              <React.Fragment key={i}>
                {part}
                {i < parts.length - 1 && (
                  <motion.span animate={status === "correct" ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    className={`inline-block min-w-[5rem] border-b-4 mx-1 px-2 ${status === "correct" ? "border-emerald-400 text-emerald-300" : "border-sky-400 text-sky-300 animate-pulse"}`}>
                    {status === "correct" ? challenge.answer : locked || "___"}
                  </motion.span>
                )}
              </React.Fragment>
            ))}
          </p>
        )}
        <p className="text-xs text-sky-200/60 mt-4">{t("cloze_guess_middle")}</p>
        <button type="button" onClick={speakQuestion} className="mt-3 text-sm text-sky-200/70 active:text-white underline">{t("cloze_listen")}</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {challenge.options?.map((opt, i) => (
          <motion.button key={`${i}-${opt}`} whileTap={{ scale: 0.92 }} disabled={disabled || status === "correct"} onClick={() => pick(opt)}
            className={`rounded-2xl py-6 sm:py-8 font-bold text-lg sm:text-xl kaiti border-b-4 active:border-b-0 active:translate-y-1 ${
              status === "correct" && opt === challenge.answer ? "bg-emerald-500 text-slate-900 border-emerald-700 ring-4 ring-emerald-300" :
              locked === opt && status === "wrong" ? "bg-rose-500/40 border-rose-400 text-white shake" : "bg-sky-500/80 border-sky-700 text-white"
            } ${status === "correct" && opt !== challenge.answer ? "opacity-30" : ""}`}>{opt}</motion.button>
        ))}
      </div>
      {status === "wrong" && challenge.hint && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 p-3 text-center text-amber-100 text-sm kaiti">{t("cloze_hint_prefix")}{challenge.hint}</div>
      )}
    </div>
  );
}
