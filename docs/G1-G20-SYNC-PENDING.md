# G1–G20 sync — PENDING user approval (2026-07-05)

**Status:** Emergent iteration-6 bundle merged into local app for preview. **Do not treat as final** until user says "ok".

## Rollback

Pre-sync files backed up at:

```
_backup/pre-emergent-sync-2026-07-05/
  frontend/src/components/games/*   (all 23 game files)
  frontend/src/lib/i18n.js, design.js, gameFeel.js (if existed), stepThemes.js, api.js
  frontend/src/pages/BattlePage.jsx, SettingsPage.jsx
  frontend/src/components/StrokeOrderTeach.jsx, StreakSaveModal.jsx (if existed)
```

To revert games only:

```powershell
Copy-Item "_backup\pre-emergent-sync-2026-07-05\frontend\src\components\games\*" "frontend\src\components\games\" -Force
Copy-Item "_backup\pre-emergent-sync-2026-07-05\frontend\src\pages\BattlePage.jsx" "frontend\src\pages\" -Force
Remove-Item "frontend\src\lib\gameFeel.js","frontend\src\lib\diamonds.js" -ErrorAction SilentlyContinue
Remove-Item "frontend\src\components\StreakSaveModal.jsx" -ErrorAction SilentlyContinue
# Then undo GameFeelProvider wrap in App.js
```

## What the **previous** version had (before Emergent sync)

| Area | Pre-sync behavior |
|------|-------------------|
| **TapChoiceGame** | Lane shooter with crosshair, falling targets, gun dock; rhythm pulse but no PERFECT/GREAT ratings |
| **StrikeArenaInput** | IME-safe slots + visible input; per-game action buttons; no arcade runway / enemy HP / projectile-per-keystroke |
| **BubblePop / Slash / MemoryFlip** | Arena layout; no `useGameFeel()` particles / screen shake / combo juice |
| **BattlePage** | Duel HUD (boss ↔ player HP inline), hyper mode at combo ≥5, i18n via `t()`; **no** streak-save modal or 💎 HUD |
| **Diamonds / Streak Save** | Did not exist — wrong answer always broke combo immediately |
| **gameFeel.js** | Did not exist — no global juice layer |
| **Lib files kept (not overwritten)** | `api.js` (kid_device_id, X-Kid-Mode, parent Gemini key), `design.js` (local assets not Emergent CDN), `tts.js` (CJK variant matching), `listenMode.js` (word/sentence), `progressSnapshot.js` (server + battleSnapshot sync), `stepThemes.js` (journey theme_id map), `ocr.js` |
| **i18n** | English UI wired for battle chrome + GameActionButton (prior pass) |

## What the **new** version adds (Emergent iteration 6)

| File | Change |
|------|--------|
| `gameFeel.js` | NEW — global particles, PERFECT/GREAT/GOOD popups, screen shake, coin drops, combo fire |
| `diamonds.js` | NEW — localStorage 💎 (starter 5); earn on x5 combo; spend on streak save |
| `StreakSaveModal.jsx` | NEW — spend 1💎 to rescue combo ≥3 before it breaks |
| `TapChoiceGame.jsx` | Rewritten — 96 BPM pulse, crosshair, laser, timing ratings |
| `StrikeArenaInput.jsx` | Rewritten — arcade runway, enemy HP, keystroke projectiles |
| `BubblePopGame`, `SlashGame`, `MemoryFlipGame` | Wired to `fx.hit` / `fx.miss` |
| `BattlePage.jsx` | Streak-save flow + 💎 HUD column; diamond earn on combo milestones |
| `App.js` | Wrapped in `<GameFeelProvider>` |

## Emergent elements **removed / not imported**

- `design.js` from zip — used Emergent CDN URLs; **kept our local** `src/assets/emergent/` imports
- `api.js` from zip — stripped kid_mode / kid_device_id; **kept ours**
- Simplified `tts.js`, `listenMode.js`, `playtime.js`, `progressSnapshot.js`, `stepThemes.js`, `ocr.js` — **kept ours** (Emergent stubs would break resume engine + CJK matching)

## Preview checklist

1. Start backend + frontend (see README)
2. Upload a worksheet → start battle
3. Try **G3 Tap Attack** — timing ratings, rhythm pulse
4. Try **G9 dictation** — StrikeArenaInput runway
5. Build combo ≥3, miss once — **Streak Save** modal should appear
6. Confirm 💎 counter in battle HUD
7. Settings → language English — UI should stay English (worksheet content may still be Chinese)

## User decision

When satisfied: user says **"ok"** → mark this doc approved and optionally delete `_backup/` + `_import/`.

If not satisfied: run rollback commands above.
