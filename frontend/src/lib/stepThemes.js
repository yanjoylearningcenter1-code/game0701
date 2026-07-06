/**
 * Per-step visual themes for journey battles (Tailwind classes must be static strings).
 * Keys match backend `theme_id` from journey_engine.get_step_theme().
 */

const DEFAULT = {
  pageBg: "bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950",
  pageGlow: "opacity-30 bg-[radial-gradient(circle_at_20%_10%,#7c3aed_0,transparent_50%),radial-gradient(circle_at_80%_30%,#0ea5e9_0,transparent_50%)]",
  bossCard: "border-rose-500/30 bg-black/40",
  bossHp: "from-rose-400 to-red-600",
  arena: "border-violet-500/20 bg-black/25 shadow-[0_0_40px_rgba(124,58,237,0.12)]",
  playerCard: "border-emerald-500/30",
  banner: "border-white/20 bg-white/5 text-white/90",
  progress: "from-amber-400 via-yellow-300 to-orange-400",
  emoji: "⚔️",
};

const THEMES = {
  meadow: {
    pageBg: "bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950",
    pageGlow: "opacity-35 bg-[radial-gradient(circle_at_30%_15%,#34d399_0,transparent_45%),radial-gradient(circle_at_70%_25%,#2dd4bf_0,transparent_40%)]",
    bossCard: "border-emerald-400/35 bg-emerald-950/30",
    bossHp: "from-emerald-400 to-teal-600",
    arena: "border-emerald-400/25 bg-emerald-950/20 shadow-[0_0_36px_rgba(52,211,153,0.15)]",
    playerCard: "border-teal-400/30",
    banner: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    progress: "from-emerald-400 via-teal-300 to-cyan-400",
    emoji: "🫧",
  },
  library: {
    pageBg: "bg-gradient-to-b from-sky-950 via-indigo-950 to-slate-950",
    pageGlow: "opacity-30 bg-[radial-gradient(circle_at_25%_12%,#38bdf8_0,transparent_48%),radial-gradient(circle_at_75%_20%,#818cf8_0,transparent_42%)]",
    bossCard: "border-sky-400/35 bg-sky-950/25",
    bossHp: "from-sky-400 to-indigo-600",
    arena: "border-sky-400/25 bg-sky-950/20 shadow-[0_0_36px_rgba(56,189,248,0.14)]",
    playerCard: "border-sky-400/30",
    banner: "border-sky-400/40 bg-sky-500/15 text-sky-100",
    progress: "from-sky-400 via-blue-300 to-indigo-400",
    emoji: "📚",
  },
  forge: {
    pageBg: "bg-gradient-to-b from-amber-950 via-orange-950 to-slate-950",
    pageGlow: "opacity-30 bg-[radial-gradient(circle_at_20%_10%,#fbbf24_0,transparent_45%),radial-gradient(circle_at_80%_30%,#f97316_0,transparent_40%)]",
    bossCard: "border-amber-400/35 bg-amber-950/25",
    bossHp: "from-amber-400 to-orange-600",
    arena: "border-amber-400/25 bg-amber-950/20 shadow-[0_0_36px_rgba(251,191,36,0.14)]",
    playerCard: "border-amber-400/30",
    banner: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    progress: "from-amber-400 via-yellow-300 to-orange-400",
    emoji: "🔤",
  },
  echo: {
    pageBg: "bg-gradient-to-b from-violet-950 via-purple-950 to-slate-950",
    pageGlow: "opacity-30 bg-[radial-gradient(circle_at_22%_12%,#a78bfa_0,transparent_45%),radial-gradient(circle_at_78%_28%,#c084fc_0,transparent_40%)]",
    bossCard: "border-violet-400/35 bg-violet-950/25",
    bossHp: "from-violet-400 to-purple-600",
    arena: "border-violet-400/25 bg-violet-950/20 shadow-[0_0_36px_rgba(167,139,250,0.14)]",
    playerCard: "border-violet-400/30",
    banner: "border-violet-400/40 bg-violet-500/15 text-violet-100",
    progress: "from-violet-400 via-purple-300 to-fuchsia-400",
    emoji: "🔊",
  },
  bonus: {
    pageBg: "bg-gradient-to-b from-fuchsia-950 via-violet-950 to-slate-950",
    pageGlow: "opacity-35 bg-[radial-gradient(circle_at_30%_15%,#e879f9_0,transparent_45%),radial-gradient(circle_at_70%_25%,#f472b6_0,transparent_40%)]",
    bossCard: "border-fuchsia-400/40 bg-fuchsia-950/30",
    bossHp: "from-fuchsia-400 to-pink-600",
    arena: "border-fuchsia-400/30 bg-fuchsia-950/25 shadow-[0_0_40px_rgba(232,121,249,0.18)]",
    playerCard: "border-fuchsia-400/30",
    banner: "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100",
    progress: "from-fuchsia-400 via-pink-300 to-rose-400",
    emoji: "✨",
  },
  arena: {
    pageBg: "bg-gradient-to-b from-cyan-950 via-slate-900 to-slate-950",
    pageGlow: "opacity-30 bg-[radial-gradient(circle_at_25%_10%,#22d3ee_0,transparent_45%),radial-gradient(circle_at_75%_30%,#f43f5e_0,transparent_38%)]",
    bossCard: "border-cyan-400/35 bg-cyan-950/20",
    bossHp: "from-cyan-400 to-rose-500",
    arena: "border-cyan-400/30 bg-cyan-950/15 shadow-[0_0_40px_rgba(34,211,238,0.16)]",
    playerCard: "border-cyan-400/30",
    banner: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100",
    progress: "from-cyan-400 via-sky-300 to-rose-400",
    emoji: "⚡",
  },
  sprint: {
    pageBg: "bg-gradient-to-b from-rose-950 via-orange-950 to-slate-950",
    pageGlow: "opacity-35 bg-[radial-gradient(circle_at_20%_10%,#fb7185_0,transparent_45%),radial-gradient(circle_at_80%_25%,#fb923c_0,transparent_40%)]",
    bossCard: "border-rose-400/40 bg-rose-950/25",
    bossHp: "from-rose-400 to-orange-600",
    arena: "border-rose-400/30 bg-rose-950/20 shadow-[0_0_40px_rgba(251,113,133,0.16)]",
    playerCard: "border-rose-400/30",
    banner: "border-rose-400/45 bg-rose-500/18 text-rose-100",
    progress: "from-rose-400 via-orange-300 to-amber-400",
    emoji: "🏃",
  },
  rehearsal: {
    pageBg: "bg-gradient-to-b from-orange-950 via-amber-950 to-slate-950",
    pageGlow: "opacity-35 bg-[radial-gradient(circle_at_28%_12%,#fb923c_0,transparent_48%),radial-gradient(circle_at_72%_22%,#fcd34d_0,transparent_42%)]",
    bossCard: "border-orange-400/40 bg-orange-950/25",
    bossHp: "from-orange-400 to-amber-500",
    arena: "border-orange-400/35 bg-orange-950/20 shadow-[0_0_40px_rgba(251,146,60,0.18)]",
    playerCard: "border-orange-400/35",
    banner: "border-orange-400/50 bg-orange-500/20 text-orange-50",
    progress: "from-orange-400 via-amber-300 to-yellow-400",
    emoji: "🎯",
  },
  finale: {
    pageBg: "bg-gradient-to-b from-yellow-950 via-amber-950 to-slate-950",
    pageGlow: "opacity-40 bg-[radial-gradient(circle_at_50%_8%,#fbbf24_0,transparent_50%),radial-gradient(circle_at_20%_40%,#f59e0b_0,transparent_35%)]",
    bossCard: "border-yellow-400/50 bg-gradient-to-br from-amber-950/50 to-yellow-950/30",
    bossHp: "from-yellow-300 to-amber-600",
    arena: "border-yellow-400/40 bg-amber-950/25 shadow-[0_0_48px_rgba(251,191,36,0.22)]",
    playerCard: "border-yellow-400/40",
    banner: "border-yellow-400/55 bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-yellow-50",
    progress: "from-yellow-300 via-amber-300 to-orange-400",
    emoji: "🏁",
  },
  scroll: {
    pageBg: "bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950",
    pageGlow: "opacity-30 bg-[radial-gradient(circle_at_30%_15%,#818cf8_0,transparent_45%),radial-gradient(circle_at_70%_25%,#a78bfa_0,transparent_40%)]",
    bossCard: "border-indigo-400/35 bg-indigo-950/25",
    bossHp: "from-indigo-400 to-violet-600",
    arena: "border-indigo-400/25 bg-indigo-950/20 shadow-[0_0_36px_rgba(129,140,248,0.14)]",
    playerCard: "border-indigo-400/30",
    banner: "border-indigo-400/40 bg-indigo-500/15 text-indigo-100",
    progress: "from-indigo-400 via-violet-300 to-purple-400",
    emoji: "📜",
  },
};

export function getStepTheme(themeId) {
  return THEMES[themeId] || DEFAULT;
}

export function themeForJourneyGame(game) {
  const id = game?.step_theme?.theme_id
    || game?.step_theme_id
    || (game?.optional_step ? "bonus" : null)
    || (game?.single_pass ? "finale" : null)
    || (game?.rehearsal ? "rehearsal" : null);
  return getStepTheme(id || "meadow");
}

export { DEFAULT as DEFAULT_STEP_THEME };
