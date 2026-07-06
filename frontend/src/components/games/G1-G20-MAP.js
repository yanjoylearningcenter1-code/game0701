/**
 * G1–G20 file map — edit these files to customize each game.
 * Strings: frontend/src/lib/i18n.js (search "action_", "shooter_", game keys)
 * Challenge builders: backend/game_library.py (build_challenge per G*)
 * Battle routing: frontend/src/pages/BattlePage.jsx (challenge.type / game_type)
 */

export const G1_G20_MAP = {
  G1: {
    name: "Bubble Pop",
    name_zh: "泡泡消除",
    component: "frontend/src/components/games/BubblePopGame.jsx",
    challengeType: "tap",
    builder: "backend/game_library.py → gid == 'G1'",
  },
  G2: {
    name: "Memory Match",
    name_zh: "記憶配對",
    component: "frontend/src/components/games/MemoryFlipGame.jsx",
    variant: "memory",
    challengeType: "memory_match",
    builder: "backend/game_library.py → gid == 'G2'",
  },
  G3: {
    name: "Tap Attack",
    name_zh: "一觸即中",
    component: "frontend/src/components/games/TapChoiceGame.jsx",
    variant: "G3",
    challengeType: "tap",
    builder: "backend/game_library.py → gid == 'G3'",
  },
  G4: {
    name: "Missing Letter Fill",
    name_zh: "填字入格",
    component: "frontend/src/components/games/FillBlankGame.jsx",
    variant: "letters",
    challengeType: "missing_letter",
    builder: "backend/game_library.py → gid == 'G4'",
  },
  "G4-zh": {
    name: "Radical Detective (zh)",
    component: "frontend/src/components/games/WordDetectiveGame.jsx",
    challengeType: "word_detective",
    builder: "backend/game_library.py → gid == 'G4-zh'",
  },
  G5: {
    name: "Missing Word Fill-in",
    name_zh: "填空缺字",
    component: "frontend/src/components/games/FillBlankGame.jsx",
    variant: "sentence",
    challengeType: "missing_letter",
    builder: "backend/game_library.py → gid == 'G5'",
  },
  G6: {
    name: "Word Unscramble",
    name_zh: "拼字重組",
    component: "frontend/src/components/games/UnscrambleGame.jsx",
    challengeType: "drag",
    builder: "backend/game_library.py → gid == 'G6'",
  },
  "G6-zh": {
    name: "Sentence Order (zh)",
    component: "frontend/src/components/games/LogicOrderGame.jsx",
    challengeType: "drag (sentence)",
    builder: "backend/game_library.py → gid == 'G6-zh'",
  },
  G7: {
    name: "Slash Game",
    name_zh: "詞語切切樂",
    component: "frontend/src/components/games/SlashGame.jsx",
    challengeType: "slash",
    builder: "backend/game_library.py → gid == 'G7'",
  },
  G8: {
    name: "Speed Reading",
    name_zh: "拆彈速讀",
    component: "frontend/src/components/games/SpeedGridGame.jsx",
    challengeType: "speed_grid",
    builder: "backend/game_library.py → gid == 'G8'",
  },
  G9: {
    name: "Typed Recall",
    name_zh: "打字回想",
    component: "frontend/src/components/games/DictationGame.jsx",
    shared: "frontend/src/components/games/StrikeArenaInput.jsx",
    challengeType: "typing",
    builder: "backend/game_library.py → gid == 'G9'",
  },
  G10: {
    name: "Error Detection",
    name_zh: "錯題偵測",
    component: "frontend/src/components/games/TapChoiceGame.jsx",
    variant: "G10",
    challengeType: "tap",
    builder: "backend/game_library.py → gid == 'G10'",
  },
  G11: {
    name: "Scenario MC",
    name_zh: "情境選擇題",
    component: "frontend/src/components/games/TapChoiceGame.jsx",
    variant: "G11",
    challengeType: "tap",
    builder: "backend/game_library.py → gid == 'G11'",
  },
  G12: {
    name: "Word Detective",
    name_zh: "文字探測器",
    component: "frontend/src/components/games/WordDetectiveGame.jsx",
    challengeType: "word_detective",
    builder: "backend/game_library.py → gid == 'G12'",
  },
  G13: {
    name: "Contextual Cloze",
    name_zh: "語境填空",
    component: "frontend/src/components/games/ClozeFillGame.jsx",
    challengeType: "cloze_fill",
    builder: "backend/game_library.py → gid == 'G13'",
  },
  G14: { name: "(reserved)", component: null },
  G15: { name: "(reserved)", component: null },
  G16: {
    name: "Flashcard Flip / Memory Write",
    name_zh: "咭卡翻轉",
    components: [
      "frontend/src/components/games/MemoryFlipGame.jsx",
      "frontend/src/components/games/MemoryWriteGame.jsx",
      "frontend/src/components/games/FlashCardReadGame.jsx",
    ],
    challengeTypes: ["flashcard", "memory_write", "flashcard_read"],
    builder: "backend/game_library.py → gid == 'G16'",
  },
  G17: {
    name: "Sentence Making",
    name_zh: "造句挑戰",
    component: "frontend/src/components/games/SentenceMakingGame.jsx",
    challengeType: "sentence_making",
    builder: "backend/game_library.py → gid == 'G17'",
  },
  G18: {
    name: "Crossword",
    name_zh: "填字遊戲",
    component: "frontend/src/components/games/FillBlankGame.jsx",
    variant: "crossword",
    challengeType: "crossword",
    builder: "backend/game_library.py → gid == 'G18'",
  },
  G19: {
    name: "Synonym Match",
    name_zh: "同義配對",
    component: "frontend/src/components/games/MemoryFlipGame.jsx",
    variant: "synonym",
    challengeType: "memory_match",
    builder: "backend/game_library.py → gid == 'G19'",
  },
  G20: {
    name: "Rescue Mission",
    name_zh: "救援行動",
    component: "frontend/src/components/games/RescueGame.jsx",
    challengeType: "rescue",
    builder: "backend/game_library.py → gid in ('G20', 'G20-zh')",
  },
};

/** Shared UI helpers */
export const GAME_SHARED = {
  actionButtons: "frontend/src/components/games/GameActionButton.jsx",
  strikeInput: "frontend/src/components/games/StrikeArenaInput.jsx",
  shooterGun: "frontend/src/components/games/GameFireGun.jsx",
  battlePage: "frontend/src/pages/BattlePage.jsx",
  i18n: "frontend/src/lib/i18n.js",
  gameLibrary: "backend/game_library.py",
  journeyEngine: "backend/journey_engine.py",
};

export default G1_G20_MAP;
