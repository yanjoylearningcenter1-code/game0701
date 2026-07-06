/** Game Library G1–G20 labels (matches backend game_library.py) */
export const GAME_LABELS = {
  G1: "🫧 Bubble Pop",
  G2: "🃏 Memory Match",
  G3: "🎯 Tap Attack",
  G4: "✏️ Fill Letters",
  "G4-zh": "✏️ 補部件",
  G5: "📝 Missing Word",
  G6: "🧩 Unscramble",
  "G6-zh": "🧩 部件重組",
  G7: "⚔️ Slash",
  G8: "⚡ Speed Grid",
  G9: "🔊 Typed Recall",
  G10: "🔍 Error Fix",
  G11: "📖 Scenario MC",
  G12: "🔎 Word Detective",
  G13: "📚 Context Cloze",
  G16: "🃏 Flashcard",
  G17: "✍️ Sentence Making",
  G18: "📝 Crossword",
  G19: "🔗 Synonym Match",
  G20: "🦸 Rescue Mission",
  "G20-zh": "🦸 救援行動",
  READ: "📖 朗讀播放",
  HL: "✋ 標記關鍵字",
  HUNT: "🔎 搵字獵人",
  DIAG: "📊 弱項診斷",
};

export function gameLabel(gameType) {
  return GAME_LABELS[gameType] || gameType || "Mini-game";
}
