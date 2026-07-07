import React, { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";

const TIER_DOT = {
  survival: "bg-fuchsia-500",
  emergency: "bg-rose-500",
  cram: "bg-amber-500",
  standard: "bg-sky-500",
};

const TRACK_EMOJI = {
  reading_dictation: "🔊",
  recital_dictation: "📖",
  quiz: "📝",
  exam: "🎓",
};

/** Month-grid calendar for Parent/Teacher dashboards: shows quiz/exam deadlines
 * plus a daily review-load forecast (how many memory units come due each day),
 * so an adult can plan around exam dates without digging through each track. */
export default function CalendarView({ events = [], dailyLoad = [], loading = false, emptyHint }) {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const e of events) {
      (map[e.date] ||= []).push(e);
    }
    return map;
  }, [events]);

  const loadByDate = useMemo(() => {
    const map = {};
    for (const d of dailyLoad) map[d.date] = d.units_due;
    return map;
  }, [dailyLoad]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedEvents = eventsByDate[selectedDate] || [];
  const selectedLoad = loadByDate[selectedDate] || 0;

  return (
    <div data-testid="calendar-view">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-lg"
          aria-label="Previous month"
        >‹</button>
        <div className="font-display font-bold text-lg" data-testid="calendar-month-label">
          {format(month, "MMMM yyyy")}
        </div>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-lg"
          aria-label="Next month"
        >›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[key] || [];
          const load = loadByDate[key] || 0;
          const inMonth = isSameMonth(day, month);
          const selected = key === selectedDate;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              data-testid={`calendar-day-${key}`}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-colors ${
                selected
                  ? "bg-amber-500 text-white font-bold"
                  : isToday(day)
                    ? "bg-amber-100 text-amber-800 font-bold"
                    : inMonth
                      ? "hover:bg-black/5 text-slate-700"
                      : "text-slate-300"
              }`}
            >
              <span>{format(day, "d")}</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                {dayEvents.slice(0, 3).map((e, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white" : TIER_DOT[e.urgency_tier] || TIER_DOT.standard}`}
                  />
                ))}
                {load > 0 && dayEvents.length === 0 && (
                  <span className={`text-[9px] ${selected ? "text-white/90" : "text-slate-400"}`}>{load}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3 min-h-[64px]" data-testid="calendar-selected-panel">
        <div className="text-xs font-semibold text-slate-500 mb-2">
          {format(parseISO(selectedDate), "EEEE, MMM d")}
        </div>
        {loading ? (
          <div className="text-xs text-slate-400">Loading…</div>
        ) : selectedEvents.length === 0 && selectedLoad === 0 ? (
          <div className="text-xs text-slate-400">{emptyHint || "Nothing scheduled this day."}</div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" data-testid={`calendar-event-${i}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${TIER_DOT[e.urgency_tier] || TIER_DOT.standard}`} />
                <span>{TRACK_EMOJI[e.track_type] || "📌"}</span>
                <span className="font-medium truncate">{e.title}</span>
                <span className="text-xs text-slate-400 capitalize shrink-0">{(e.track_type || "").replace("_", " ")}</span>
              </div>
            ))}
            {selectedLoad > 0 && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5" data-testid="calendar-daily-load">
                🧠 <span className="font-semibold">{selectedLoad}</span> memory {selectedLoad === 1 ? "item" : "items"} due for review
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Standard</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sprint</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Emergency</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" /> Survival</span>
      </div>
    </div>
  );
}
