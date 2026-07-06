# G1-G20 Games — Updated Bundle (iteration 6)

Contains all frontend files touched or created in the latest gameful upgrade.

## What changed in this iteration

### 💎 New — Streak Save + Diamonds currency
- `frontend/src/lib/diamonds.js`                — localStorage currency (starter 5💎)
- `frontend/src/components/StreakSaveModal.jsx` — "Spend 1💎 to rescue combo" modal
- `frontend/src/pages/BattlePage.jsx`           — wires diamonds/streak-save into wrong-answer flow, +1💎 every x5 combo, HUD 4th column

### 🎮 New — Universal game "juice" primitives
- `frontend/src/lib/gameFeel.js` — `<GameFeelProvider>` + `useGameFeel()` hook:
  particles, PERFECT/GREAT/GOOD popups, coin drops, screen shake, combo fire trail,
  rhythm-beat pulse. Import once at app root; any game calls `fx.hit(x,y,{combo,responseMs,critical})` or `fx.miss(x,y)`.
- DNA borrowed from: Roblox / Fortnite / Piano Tiles / Fruit Ninja / Candy Crush /
  Subway Surfers / Puzzle & Dragons / Geometry Dash / Duolingo / Cookie Run.

### 🎯 Rewritten — TapChoiceGame (flagship)
Piano Tiles + FPS + P&D fusion. 96 BPM rhythm-pulse arena, rotating crosshair,
laser beam, PERFECT rating (<700ms → critical yellow flash), timing ratings.
`frontend/src/components/games/TapChoiceGame.jsx`

### ⌨️ Rewritten — StrikeArenaInput (used by Dictation/FullRecall/MemoryWrite)
Killed the "boring heading + box" layout. Now an arcade runway with:
enemy sprite + HP bar + rage attack meter, projectile-per-keystroke,
slot burst overlay, speed-line backdrop, hidden real `<input>` (IME safe),
backspace = misfire shake, 110 BPM pulse.
`frontend/src/components/games/StrikeArenaInput.jsx`

### 🔧 Wired fx.hit/fx.miss into:
- `BubblePopGame.jsx` (Fruit Ninja bubble DNA)
- `SlashGame.jsx` (swipe/slice DNA)
- `MemoryFlipGame.jsx` (Candy Crush chain DNA)

### 🧪 Supporting lib stubs (needed by BattlePage/SettingsPage)
- `frontend/src/lib/tts.js`               — Web Speech API wrapper + text similarity
- `frontend/src/lib/listenMode.js`        — TTS listen-mode toggle
- `frontend/src/lib/playtime.js`          — gentle "take a break" nudge
- `frontend/src/lib/progressSnapshot.js`  — mid-battle resume
- `frontend/src/lib/stepThemes.js`        — per-step-type visual theme

## File map

    frontend/src/
    ├── components/
    │   ├── games/                # 22 game components (G1-G20 + shared helpers)
    │   ├── StreakSaveModal.jsx   # NEW — 💎 rescue modal
    │   └── StrokeOrderTeach.jsx
    ├── lib/
    │   ├── gameFeel.js           # NEW — universal juice
    │   ├── diamonds.js           # NEW — 💎 currency
    │   ├── tts.js                # NEW — Web Speech API
    │   ├── listenMode.js         # NEW
    │   ├── playtime.js           # NEW
    │   ├── progressSnapshot.js   # NEW
    │   ├── stepThemes.js         # NEW
    │   ├── i18n.js               # copied from your zip
    │   ├── audio.js
    │   ├── ocr.js
    │   ├── design.js
    │   └── api.js
    └── pages/
        ├── BattlePage.jsx        # updated with streak save + diamond HUD
        └── SettingsPage.jsx

## To integrate

1. Drop the whole `frontend/src/` tree into your project.
2. Make sure `App.js` wraps routes in `<GameFeelProvider>` from `@/lib/gameFeel`.
3. Ensure Route `/settings` maps to `SettingsPage`.
4. Backend endpoints referenced by the new UI (unchanged since your last zip):
   `/api/energy`, `/api/home-status`, `/api/free-play`, `/api/tracks`, `/api/tracks/{id}/battle`,
   `/api/generate-game`, `/api/game-sessions`, `/api/reviews`, `/api/follow-ups`.

## Testing status

Iteration 6 — 100% pass (8/8 acceptance checks, 29/29 backend pytest).
See `/app/test_reports/iteration_6.json` for the full agent verdict.
