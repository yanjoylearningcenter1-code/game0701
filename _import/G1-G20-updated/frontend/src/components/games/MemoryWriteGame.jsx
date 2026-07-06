import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import StrikeArenaInput from "@/components/games/StrikeArenaInput";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import { useLang } from "@/lib/i18n";

/** G16 — flash then strike-recall. No placeholder input, no Check button. */
export default function MemoryWriteGame({
  challenge,
  typedAnswer,
  setTypedAnswer,
  onSubmit,
  disabled,
}) {
  const { t } = useLang();
  const word = challenge.word || challenge.answer || "";
  const showMs = challenge.show_ms ?? 4500;
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    setPhase("show");
    setTypedAnswer("");
    if (challenge.auto_play_audio !== false) {
      const t0 = setTimeout(() => speak(word), 300);
      const t1 = setTimeout(() => setPhase("write"), showMs);
      return () => {
        clearTimeout(t0);
        clearTimeout(t1);
      };
    }
    const t1 = setTimeout(() => setPhase("write"), showMs);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, showMs]);

  if (phase === "show") {
    return (
      <div data-testid="memory-write-show" className="flex flex-col flex-1 min-h-[52vh] w-full items-center justify-center">
        <div className="w-full flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-950/50 via-slate-950/40 to-slate-900/30 p-6">
          <div className="text-[10px] uppercase tracking-widest text-amber-200/80 mb-4">
            {t("memory_write_memorize")}
          </div>
          <motion.div
            initial={{ scale: 0.85, opacity: 0, rotateY: -20 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            className="rounded-3xl bg-gradient-to-br from-amber-500/35 to-orange-600/25 border-2 border-amber-400/50 py-14 px-12 shadow-[0_0_40px_rgba(251,191,36,0.2)]"
          >
            <div className="font-display text-5xl sm:text-7xl font-bold kaiti text-amber-50">{word}</div>
          </motion.div>
          <motion.p
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="text-xs text-white/50 mt-4"
          >
            {t("memory_write_covering")}
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="memory-write-type" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-white/10 bg-gradient-to-b from-slate-950/60 to-black/40 py-8">
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-2">🙈</motion.div>
        <p className="text-sm text-white/50">{t("memory_write_hidden")}</p>
      </div>
      <StrikeArenaInput
        value={typedAnswer}
        onChange={setTypedAnswer}
        onSubmit={() => { sfx.click(); onSubmit(); }}
        disabled={disabled}
        slotCount={[...word].length}
        accent="amber"
        action="memory"
        testId="memory-write-input"
        submitTestId="memory-write-submit"
      />
    </div>
  );
}
