import React, { useState, useMemo } from "react";

/**
 * Lightweight "parental gate" — NOT real authentication, just a speed bump so a
 * curious kid on a shared device can't casually wander into Parent/Teacher
 * analysis screens. Real access control still lives in the backend (each
 * endpoint requires a logged-in user token) — this component only protects the
 * *frontend route* from accidental taps, per ROADMAP.md Phase 2.3 / Section 13.3.
 *
 * Usage: wrap a page element, e.g. <ParentalGate>{"<ParentDashboard />"}</ParentalGate>
 */
export default function ParentalGate({ children }) {
  const [passed, setPassed] = useState(() => sessionStorage.getItem("parental_gate_passed") === "1");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);

  const { a, b } = useMemo(() => {
    const a = 2 + Math.floor(Math.random() * 7);
    const b = 2 + Math.floor(Math.random() * 7);
    return { a, b };
  }, []);

  if (passed) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseInt(answer, 10) === a * b) {
      sessionStorage.setItem("parental_gate_passed", "1");
      setPassed(true);
    } else {
      setError(true);
      setAnswer("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-8 text-center space-y-4"
        data-testid="parental-gate"
      >
        <div className="text-3xl">👨‍👩‍👧</div>
        <h2 className="text-lg font-bold text-white">家長 / 老師專區</h2>
        <p className="text-sm text-slate-400">answer this to continue — this just keeps kids from wandering in by accident</p>
        <p className="text-2xl font-mono text-amber-300">{a} × {b} = ?</p>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); setError(false); }}
          className="w-full rounded-xl bg-slate-800 border border-slate-600 text-white text-center text-xl py-2"
          data-testid="parental-gate-input"
        />
        {error && <p className="text-rose-400 text-sm">唔啱，再試下</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2"
          data-testid="parental-gate-submit"
        >
          進入
        </button>
      </form>
    </div>
  );
}
