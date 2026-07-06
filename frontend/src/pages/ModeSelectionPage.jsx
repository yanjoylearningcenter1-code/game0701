import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MODES, Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { format, differenceInCalendarDays } from "date-fns";

const CALENDAR_DARK = {
  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
  month: "space-y-4",
  caption: "flex justify-center pt-1 relative items-center",
  caption_label: "text-sm font-semibold text-white",
  nav: "space-x-1 flex items-center",
  nav_button: "h-8 w-8 bg-white/10 p-0 text-white hover:bg-white/20 rounded-md inline-flex items-center justify-center",
  nav_button_previous: "absolute left-1",
  nav_button_next: "absolute right-1",
  table: "w-full border-collapse space-y-1",
  head_row: "flex",
  head_cell: "text-sky-200 rounded-md w-9 font-normal text-[0.8rem]",
  row: "flex w-full mt-2",
  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
  day: "h-9 w-9 p-0 font-normal text-white hover:bg-white/15 rounded-md",
  day_selected: "bg-amber-400 text-slate-900 hover:bg-amber-300 hover:text-slate-900 font-bold",
  day_today: "bg-white/10 text-amber-200 font-semibold",
  day_outside: "text-white/25",
  day_disabled: "text-white/20 opacity-40",
  day_hidden: "invisible",
};

export default function ModeSelectionPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [date, setDate] = useState(null);

  const daysLeft = date ? differenceInCalendarDays(date, new Date()) : null;
  const dayBasedState =
    daysLeft === null ? null
    : daysLeft >= 14 ? { label: "Bright Exploration", color: "from-sky-300 to-blue-500", emoji: "🌤️" }
    : daysLeft >= 7  ? { label: "Shadows Rising", color: "from-indigo-400 to-violet-700", emoji: "🌒" }
    : { label: "Storm Forming", color: "from-amber-500 to-rose-600", emoji: "⛈️" };
  // World theme from due-date countdown (urgency tier from backend applies on transform page).
  const worldState = dayBasedState;

  const assignFlow = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("assign_flow") : null;
  const isSelfPractice = mode === "self_practice";

  const start = () => {
    if (!mode) return;
    if (!isSelfPractice && !date) return;
    sfx.click();
    sessionStorage.setItem("mode", mode);
    if (date) sessionStorage.setItem("exam_date", date.toISOString());
    else sessionStorage.removeItem("exam_date");
    // Track creation + battle generation happen on /transform so this button
    // feels instant — no blocking "Preparing…" wait here.
    sessionStorage.removeItem("track_id");
    navigate(assignFlow ? "/assign-target" : "/transform");
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white" data-testid="mode-page">
      <Particles count={18} />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => navigate(-1)} className="text-sky-200/70 hover:text-white text-sm mb-6" data-testid="back-btn">← Back</button>
        <h1 className="font-display text-4xl sm:text-5xl font-bold">
          {assignFlow ? "Assign Quest Settings" : "Choose Your Quest"}
        </h1>
        <p className="text-sky-100/70 mt-2">
          {assignFlow
            ? "Pick track type and due date — we'll create the assignment (no battle for you)."
            : "Pick a learning mode. The world responds to your timeline."}
        </p>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-5 gap-4">
          {MODES.map((m, i) => (
            <motion.button
              key={m.id}
              data-testid={`mode-${m.id}-btn`}
              onClick={() => { sfx.click(); setMode(m.id); }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative rounded-3xl p-5 text-left overflow-hidden border-2 ${mode === m.id ? "border-amber-300 ring-4 ring-amber-300/40" : "border-white/15"} bg-gradient-to-br ${m.color} shadow-xl`}
            >
              <div className="text-4xl mb-3">{m.icon}</div>
              <div className="font-display text-2xl font-bold">{m.title}</div>
              <div className="text-xs uppercase tracking-wider text-white/80 mt-1">{m.subtitle}</div>
            </motion.button>
          ))}
        </div>

        {!isSelfPractice && (
        <div className="mt-10 rounded-3xl bg-white/5 backdrop-blur border border-white/15 p-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <h3 className="font-display text-xl font-bold">📅 Expedition Date</h3>
              <p className="text-sky-100/70 text-sm">When is your exam / dictation?</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button data-testid="date-picker-btn" className="rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20">
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-900 border-white/20 text-white">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  classNames={CALENDAR_DARK}
                  disabled={(d) => d < new Date(new Date().toDateString())}
                />
              </PopoverContent>
            </Popover>
          </div>

          {worldState && (
            <motion.div
              key={worldState.label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-5 rounded-2xl bg-gradient-to-r ${worldState.color} p-4 flex items-center justify-between`}
              data-testid="world-state"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{worldState.emoji}</span>
                <div>
                  <div className="font-display text-lg font-bold">{worldState.label}</div>
                  <div className="text-xs text-white/85">{daysLeft <= 0 ? "Battle today!" : `${daysLeft} day${daysLeft===1?"":"s"} until raid`}</div>
                </div>
              </div>
              <div className="text-xs uppercase tracking-wider text-white/80">World State</div>
            </motion.div>
          )}
        </div>
        )}

        {isSelfPractice && (
          <div className="mt-10 rounded-3xl bg-emerald-500/10 border border-emerald-400/30 p-5 text-sm text-emerald-100/90">
            🌱 Self practice — no deadline. Your brain will remind you when it's time to review.
          </div>
        )}

        <Button
          data-testid="start-battle-btn"
          onClick={start}
          disabled={!mode || (!isSelfPractice && !date)}
          className="btn-tactile w-full mt-6 rounded-2xl py-7 text-lg font-display font-bold uppercase tracking-wider bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 shadow-[0_8px_0_rgba(180,83,9,0.8)] disabled:opacity-50"
        >
          {assignFlow ? "📋 Save Assignment" : "⚔ Begin Transformation"}
        </Button>
      </div>
    </div>
  );
}
