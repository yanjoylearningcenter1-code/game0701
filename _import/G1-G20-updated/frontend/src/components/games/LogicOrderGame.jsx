import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { speak } from "@/lib/tts";
import GameActionButton from "@/components/games/GameActionButton";
import { useLang } from "@/lib/i18n";

/** G6 sentence mode — reorder fragments; auto-wins when correct, or manual submit. */
export default function LogicOrderGame({ challenge, onCorrect, onWrong, disabled }) {
  const { t } = useLang();
  const answer = challenge.answer || [];
  const [items, setItems] = useState([]);

  useEffect(() => {
    const shuffled = [...(challenge.tiles || [])].sort(() => Math.random() - 0.5);
    setItems(shuffled.map((text) => ({
      text,
      originalIndex: (challenge.tiles || []).indexOf(text),
    })));
  }, [challenge]);

  const isCorrectOrder = (list) => {
    const order = list.map((it) => it.originalIndex);
    const expected = answer.map((t) => (challenge.tiles || []).indexOf(t));
    return JSON.stringify(order) === JSON.stringify(expected)
      || list.map((it) => it.text).join("") === answer.join("");
  };

  const check = () => {
    if (disabled) return;
    if (isCorrectOrder(items)) onCorrect();
    else onWrong();
  };

  const move = (index, direction) => {
    if (disabled) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    sfx.click();
    if (isCorrectOrder(next)) {
      setTimeout(() => onCorrect(), 200);
    }
  };

  const showAnswer = () => {
    if (disabled) return;
    const solved = answer.map((text) => ({
      text,
      originalIndex: (challenge.tiles || []).indexOf(text),
    }));
    setItems(solved);
    sfx.click();
    speak(answer.join(""));
  };

  return (
    <div data-testid="logic-order-game" className="flex flex-col flex-1 min-h-[52vh] w-full gap-3">
      <div className="flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-violet-950/50 via-slate-950/40 to-slate-900/30 border-2 border-violet-400/25 p-4">
        {items.map((item, index) => (
          <motion.div
            key={`${index}-${item.text}`}
            layout
            className="bg-white/10 border-2 border-violet-400/30 rounded-xl p-3 mb-2 flex items-center gap-3"
          >
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => move(index, "up")} disabled={disabled || index === 0}
                className="p-2 rounded-lg bg-violet-500/20 disabled:opacity-30 active:bg-violet-500/50 active:scale-95">↑</button>
              <button type="button" onClick={() => move(index, "down")} disabled={disabled || index === items.length - 1}
                className="p-2 rounded-lg bg-violet-500/20 disabled:opacity-30 active:bg-violet-500/50 active:scale-95">↓</button>
            </div>
            <button type="button" onClick={() => { sfx.click(); speak(item.text); }}
              className="flex-1 text-left text-lg sm:text-xl kaiti leading-relaxed active:text-violet-200">{item.text}</button>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={showAnswer} disabled={disabled}
          className="flex-none rounded-xl px-4 py-3 border border-violet-400/40 text-violet-100 text-sm active:bg-violet-500/20">
          {t("logic_peek_answer")}
        </button>
        <div className="flex-1">
          <GameActionButton variant="lockSentence" onAction={check} disabled={disabled} ready={items.length > 0} testId="logic-order-submit" />
        </div>
      </div>
    </div>
  );
}
