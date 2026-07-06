// Game Feel — universal "juice" primitives distilled from top kid games.
//
// Kid-game DNA sources & the pieces we borrow:
//   Roblox            — cosmetic reward flourishes (crown/gem burst on wins)
//   Piano Tiles       — "PERFECT / GREAT / GOOD" hit ratings + rhythm pulse
//   Fruit Ninja       — screen-shake + juice + swipe trails
//   Subway Surfers    — coin drop trajectories + streak fire trail
//   Candy Crush       — chain-combo cascade particles + sugar-crush confetti
//   Fortnite          — critical-hit yellow flash (headshot vibe)
//   Cookie Run        — power-up drops every N combo (auto-runner buff)
//   Puzzle & Dragons  — combo counter x2, x3 escalating type + colour ramp
//   Geometry Dash     — full-screen chromatic flash on beat-hits
//   Duolingo          — streak/day counter fire icon (retention nudge)
//
// This file exposes a single <GameFeelLayer> React component + `useGameFeel()`
// hook. Games just call fx.hit(x,y,{critical:true}) or fx.miss(x,y) and the
// visual/audio juice happens automatically.

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";

const GameFeelCtx = createContext(null);

let _uid = 0;
const nextId = () => `${Date.now()}_${_uid++}`;

const RATING = {
  perfect: { label: "PERFECT!", color: "text-amber-300", glow: "0 0 32px rgba(251,191,36,0.9)", bonus: 3 },
  great:   { label: "GREAT!",   color: "text-fuchsia-300", glow: "0 0 24px rgba(217,70,239,0.8)", bonus: 2 },
  good:    { label: "GOOD",     color: "text-sky-300",   glow: "0 0 16px rgba(56,189,248,0.7)", bonus: 1 },
};

// —— Public helper: given a response time (ms), rate the timing.
export function rateReaction(responseMs) {
  if (responseMs < 700) return "perfect";
  if (responseMs < 1400) return "great";
  return "good";
}

export function GameFeelProvider({ children }) {
  const [particles, setParticles] = useState([]); // {id, x, y, count, color, critical}
  const [pops, setPops] = useState([]);           // {id, x, y, rating, combo}
  const [coins, setCoins] = useState([]);         // {id, x, y}
  const [flash, setFlash] = useState(null);       // 'correct' | 'wrong' | 'critical'
  const [shakeSeed, setShakeSeed] = useState(0);
  const [beat, setBeat] = useState(0);
  const beatIntervalRef = useRef(null);
  const [comboFire, setComboFire] = useState(0);

  // —— core primitives ————————————————————————————————
  const burst = useCallback((x, y, { count = 14, color = "amber", critical = false } = {}) => {
    const id = nextId();
    setParticles((p) => [...p, { id, x, y, count, color, critical }]);
    setTimeout(() => setParticles((p) => p.filter((it) => it.id !== id)), 900);
  }, []);

  const popRating = useCallback((x, y, rating = "good", combo = 0) => {
    const id = nextId();
    setPops((p) => [...p, { id, x, y, rating, combo }]);
    setTimeout(() => setPops((p) => p.filter((it) => it.id !== id)), 750);
  }, []);

  const dropCoin = useCallback((x, y) => {
    const id = nextId();
    setCoins((c) => [...c, { id, x, y }]);
    setTimeout(() => setCoins((c) => c.filter((it) => it.id !== id)), 1200);
  }, []);

  const shake = useCallback(() => setShakeSeed((s) => s + 1), []);

  const flashScreen = useCallback((kind = "correct") => {
    setFlash({ kind, id: nextId() });
    setTimeout(() => setFlash(null), 260);
  }, []);

  // —— composed helpers ———————————————————————————————
  // hit(x,y,{combo,responseMs,critical}) — the one-liner every game uses.
  const hit = useCallback((x, y, opts = {}) => {
    const { combo = 0, responseMs = 900, critical = false } = opts;
    const rating = critical ? "perfect" : rateReaction(responseMs);
    popRating(x, y, rating, combo);
    burst(x, y, { count: critical ? 22 : 14, color: critical ? "gold" : "cyan", critical });
    dropCoin(x, y);
    if (critical) {
      shake();
      flashScreen("critical");
      sfx.combo?.(3);
    } else if (combo >= 3) {
      shake();
      sfx.combo?.(combo);
    }
    setComboFire(combo);
  }, [burst, popRating, dropCoin, shake, flashScreen]);

  const miss = useCallback((x, y) => {
    burst(x, y, { count: 8, color: "rose", critical: false });
    shake();
    flashScreen("wrong");
    setComboFire(0);
  }, [burst, shake, flashScreen]);

  // Optional rhythm pulse — call startBeat(bpm) to sync visuals to a tempo.
  const startBeat = useCallback((bpm = 90) => {
    if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    const ms = 60000 / bpm;
    beatIntervalRef.current = setInterval(() => setBeat((b) => b + 1), ms);
  }, []);
  const stopBeat = useCallback(() => {
    if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    beatIntervalRef.current = null;
  }, []);

  const api = useMemo(() => ({
    hit, miss, burst, popRating, dropCoin, shake, flashScreen, startBeat, stopBeat, beat, comboFire,
  }), [hit, miss, burst, popRating, dropCoin, shake, flashScreen, startBeat, stopBeat, beat, comboFire]);

  const shakeX = shakeSeed ? [0, -6, 6, -4, 4, 0] : 0;

  return (
    <GameFeelCtx.Provider value={api}>
      <motion.div
        animate={{ x: shakeX }}
        transition={{ duration: 0.35 }}
        className="relative"
      >
        {children}

        {/* Beat pulse overlay (subtle, only visible if a game calls startBeat) */}
        {beat > 0 && (
          <motion.div
            key={beat}
            initial={{ opacity: 0.15, scale: 1 }}
            animate={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none fixed inset-0 z-[45] ring-4 ring-white/10"
          />
        )}

        {/* Combo fire trail (Subway Surfers x Duolingo) */}
        {comboFire >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none fixed top-24 right-4 z-[46] flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.7)]"
          >
            <span className="text-lg">🔥</span>
            <span className="font-display font-black text-white">x{comboFire}</span>
          </motion.div>
        )}

        {/* Full-screen tint flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.id}
              initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.26 }}
              className={`pointer-events-none fixed inset-0 z-[47] ${
                flash.kind === "critical" ? "bg-amber-300" :
                flash.kind === "wrong" ? "bg-rose-500" : "bg-emerald-300"
              }`}
            />
          )}
        </AnimatePresence>

        {/* Particle bursts */}
        <div className="pointer-events-none fixed inset-0 z-[48]">
          <AnimatePresence>
            {particles.map((p) => (
              <ParticleBurst key={p.id} {...p} />
            ))}
          </AnimatePresence>
        </div>

        {/* PERFECT / GREAT / GOOD popups */}
        <div className="pointer-events-none fixed inset-0 z-[49]">
          <AnimatePresence>
            {pops.map((p) => {
              const r = RATING[p.rating] || RATING.good;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.4, y: 0 }}
                  animate={{ opacity: 1, scale: 1.2, y: -32 }}
                  exit={{ opacity: 0, y: -56, scale: 0.9 }}
                  transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, textShadow: r.glow }}
                  className={`absolute -translate-x-1/2 font-display font-black text-3xl sm:text-4xl ${r.color}`}
                >
                  {r.label}
                  {p.combo >= 2 && <span className="ml-2 text-lg text-white/90">x{p.combo}</span>}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Coin drops */}
        <div className="pointer-events-none fixed inset-0 z-[47]">
          <AnimatePresence>
            {coins.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: 0, x: (Math.random() - 0.5) * 80, y: 120, scale: 1 }}
                transition={{ duration: 1.1, ease: "easeIn" }}
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                className="absolute -translate-x-1/2 text-2xl"
              >💰</motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </GameFeelCtx.Provider>
  );
}

function ParticleBurst({ x, y, count, color, critical }) {
  const palette = {
    amber:  ["#fbbf24", "#f59e0b", "#fde68a"],
    gold:   ["#facc15", "#fbbf24", "#fde047", "#ffffff"],
    cyan:   ["#22d3ee", "#38bdf8", "#67e8f9"],
    rose:   ["#f43f5e", "#fb7185", "#fecdd3"],
    violet: ["#a78bfa", "#c084fc", "#e9d5ff"],
  };
  const colors = palette[color] || palette.amber;
  const shards = Array.from({ length: count }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 60 + Math.random() * (critical ? 140 : 80);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    return { i, dx, dy, c: colors[i % colors.length] };
  });
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      {shards.map((s) => (
        <motion.div
          key={s.i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.dx, y: s.dy, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: s.c, boxShadow: `0 0 8px ${s.c}` }}
        />
      ))}
      {critical && (
        <motion.div
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-4xl"
          style={{ left: 0, top: 0 }}
        >💥</motion.div>
      )}
    </div>
  );
}

export function useGameFeel() {
  const ctx = useContext(GameFeelCtx);
  // Fallback no-op API so games work even if not wrapped in a provider
  if (!ctx) {
    const noop = () => {};
    return {
      hit: noop, miss: noop, burst: noop, popRating: noop, dropCoin: noop,
      shake: noop, flashScreen: noop, startBeat: noop, stopBeat: noop, beat: 0, comboFire: 0,
    };
  }
  return ctx;
}
