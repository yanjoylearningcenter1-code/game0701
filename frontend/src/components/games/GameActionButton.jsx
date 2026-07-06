import React from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

const VARIANT_KEYS = {
  strike: { ready: "action_strike_ready", wait: "action_strike_wait" },
  stamp: { ready: "action_stamp_ready", wait: "action_stamp_wait" },
  puzzle: { ready: "action_puzzle_ready", wait: "action_puzzle_wait" },
  ink: { ready: "action_ink_ready", wait: "action_ink_wait" },
  memory: { ready: "action_memory_ready", wait: "action_memory_wait" },
  scroll: { ready: "action_scroll_ready", wait: "action_scroll_wait" },
  compose: { ready: "action_compose_ready", wait: "action_compose_wait" },
  lock: { ready: "action_lock_ready", wait: "action_lock_wait" },
  lockSentence: { ready: "action_lock_sentence_ready", wait: "action_lock_sentence_wait" },
  know: { ready: "action_know_ready", wait: "action_know_wait" },
};

const GRADIENTS = {
  strike: { gradient: "from-amber-400 to-orange-600", border: "border-orange-800", text: "text-slate-900" },
  stamp: { gradient: "from-emerald-400 to-teal-600", border: "border-teal-800", text: "text-slate-900" },
  puzzle: { gradient: "from-indigo-400 to-violet-600", border: "border-violet-900", text: "text-white" },
  ink: { gradient: "from-sky-400 to-blue-600", border: "border-blue-900", text: "text-slate-900" },
  memory: { gradient: "from-amber-400 to-orange-600", border: "border-orange-900", text: "text-slate-900" },
  scroll: { gradient: "from-amber-400 to-amber-600", border: "border-amber-800", text: "text-slate-900" },
  compose: { gradient: "from-emerald-400 to-emerald-600", border: "border-emerald-900", text: "text-slate-900" },
  lock: { gradient: "from-amber-400 to-amber-600", border: "border-amber-800", text: "text-slate-900" },
  lockSentence: { gradient: "from-violet-400 to-purple-600", border: "border-purple-800", text: "text-white" },
  know: { gradient: "from-emerald-400 to-emerald-600", border: "border-emerald-800", text: "text-slate-900" },
};

/** Per-game themed confirm — labels from i18n (en / zh-HK). */
export default function GameActionButton({
  variant = "strike",
  onAction,
  disabled,
  ready,
  testId = "typing-submit-btn",
}) {
  const { t } = useLang();
  const keys = VARIANT_KEYS[variant] || VARIANT_KEYS.strike;
  const style = GRADIENTS[variant] || GRADIENTS.strike;
  const canAct = ready && !disabled;

  const act = () => {
    if (!canAct) return;
    sfx.click();
    onAction?.();
  };

  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={act}
      disabled={!canAct}
      whileTap={canAct ? { scale: 0.96, y: 2 } : {}}
      className={`btn-tactile w-full rounded-2xl py-5 sm:py-6 font-display text-lg sm:text-xl font-bold bg-gradient-to-b ${style.gradient} ${style.text} border-b-4 ${style.border} active:border-b-0 active:translate-y-1 disabled:opacity-45 disabled:grayscale touch-manipulation`}
    >
      {canAct ? t(keys.ready) : t(keys.wait)}
    </motion.button>
  );
}
