import React, { useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import { useLang } from "@/lib/i18n";
import GameActionButton from "@/components/games/GameActionButton";

/** G16 read-along flash — tap card to hear, then confirm. */
export default function FlashCardReadGame({ challenge, onCorrect, disabled }) {
  const { t } = useLang();
  const [tapped, setTapped] = useState(false);

  const tapCard = () => {
    if (disabled) return;
    sfx.click();
    speak(challenge.word || challenge.answer);
    setTapped(true);
  };

  return (
    <div data-testid="flashcard-read-game" className="flex flex-col flex-1 min-h-[52vh] w-full gap-4">
      <motion.button
        type="button"
        onClick={tapCard}
        disabled={disabled}
        whileTap={{ scale: 0.97 }}
        className="relative flex-1 w-full max-w-md mx-auto rounded-[32px] bg-gradient-to-br from-amber-500/25 to-orange-600/20 border-4 border-amber-400/50 shadow-[0_0_40px_rgba(251,191,36,0.15)] flex flex-col items-center justify-center p-8"
      >
        <motion.div
          animate={{ rotateY: tapped ? [0, 8, 0] : 0 }}
          className="font-display text-5xl sm:text-6xl font-bold text-amber-100 kaiti mb-4"
        >
          {challenge.word || challenge.answer}
        </motion.div>
        {challenge.definition && (
          <p className="text-lg text-amber-200/80 kaiti text-center leading-relaxed">{challenge.definition}</p>
        )}
        <p className="mt-6 text-xs text-white/40">{tapped ? t("flashcard_tapped") : t("flashcard_tap_to_read")}</p>
      </motion.button>

      <GameActionButton
        variant="know"
        onAction={onCorrect}
        disabled={disabled}
        ready={tapped}
        testId="flashcard-read-confirm"
      />
    </div>
  );
}
