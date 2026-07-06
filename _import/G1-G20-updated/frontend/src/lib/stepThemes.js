// Step Themes — visual styling per Learning Journey step / game type.
// Each theme provides an emoji, arena tint hex, and label so BattlePage
// can wrap different games in different world atmospheres.

const DEFAULT_THEME = {
  emoji: "⚔",
  label: "Battle",
  tint: "#0ea5e9",       // sky-500
  arenaClass: "from-sky-950/60 via-slate-950/80 to-slate-900",
  accentClass: "text-sky-200",
};

const THEMES_BY_TYPE = {
  tap:               { emoji: "🎯", label: "Tap Attack",       tint: "#f43f5e", arenaClass: "from-rose-950/60 via-slate-950/80 to-slate-900",   accentClass: "text-rose-200"   },
  slash:             { emoji: "🗡️", label: "Slash Arena",       tint: "#ef4444", arenaClass: "from-red-950/60 via-slate-950/80 to-slate-900",    accentClass: "text-red-200"    },
  speed_grid:        { emoji: "⚡", label: "Speed Grid",        tint: "#fbbf24", arenaClass: "from-amber-950/60 via-slate-950/80 to-slate-900",  accentClass: "text-amber-200"  },
  typing:            { emoji: "⌨️", label: "Typed Recall",      tint: "#a78bfa", arenaClass: "from-violet-950/60 via-slate-950/80 to-slate-900", accentClass: "text-violet-200" },
  drag:              { emoji: "🧩", label: "Reconstruction",    tint: "#8b5cf6", arenaClass: "from-purple-950/60 via-slate-950/80 to-slate-900", accentClass: "text-purple-200" },
  memory_flash:      { emoji: "⚡", label: "Memory Flash",       tint: "#c084fc", arenaClass: "from-fuchsia-950/60 via-slate-950/80 to-slate-900", accentClass: "text-fuchsia-200" },
  memory_match:      { emoji: "🃏", label: "Memory Match",       tint: "#a78bfa", arenaClass: "from-violet-950/60 via-slate-950/80 to-slate-900", accentClass: "text-violet-200" },
  memory_write:      { emoji: "✍️", label: "Memory Write",       tint: "#f472b6", arenaClass: "from-pink-950/60 via-slate-950/80 to-slate-900",   accentClass: "text-pink-200"   },
  flashcard:         { emoji: "🎴", label: "Flashcard",          tint: "#fb923c", arenaClass: "from-orange-950/60 via-slate-950/80 to-slate-900", accentClass: "text-orange-200" },
  flashcard_read:    { emoji: "📖", label: "Flashcard Read",     tint: "#fdba74", arenaClass: "from-amber-950/60 via-slate-950/80 to-slate-900",  accentClass: "text-amber-200"  },
  missing_letter:    { emoji: "🔤", label: "Missing Letter",     tint: "#34d399", arenaClass: "from-emerald-950/60 via-slate-950/80 to-slate-900", accentClass: "text-emerald-200"},
  crossword:         { emoji: "🔡", label: "Crossword",          tint: "#4ade80", arenaClass: "from-green-950/60 via-slate-950/80 to-slate-900",   accentClass: "text-green-200"  },
  cloze_fill:        { emoji: "📝", label: "Contextual Cloze",   tint: "#818cf8", arenaClass: "from-indigo-950/60 via-slate-950/80 to-slate-900",  accentClass: "text-indigo-200" },
  word_detective:    { emoji: "🔍", label: "Word Detective",     tint: "#10b981", arenaClass: "from-emerald-950/60 via-slate-950/80 to-slate-900", accentClass: "text-emerald-200"},
  sentence_making:   { emoji: "📜", label: "Sentence Making",    tint: "#fcd34d", arenaClass: "from-yellow-950/60 via-slate-950/80 to-slate-900",  accentClass: "text-yellow-200" },
  rescue:            { emoji: "🚨", label: "Rescue Mission",     tint: "#f87171", arenaClass: "from-rose-950/60 via-slate-950/80 to-slate-900",    accentClass: "text-rose-200"   },
};

/** Given a game payload, pick a themed atmosphere for the arena. */
export function themeForJourneyGame(game) {
  if (!game || !Array.isArray(game.challenges) || game.challenges.length === 0) return DEFAULT_THEME;
  const first = game.challenges[0] || {};
  const type = first.type || first.game_type || game.game_type;
  return THEMES_BY_TYPE[type] || DEFAULT_THEME;
}

export function themeForType(type) {
  return THEMES_BY_TYPE[type] || DEFAULT_THEME;
}
