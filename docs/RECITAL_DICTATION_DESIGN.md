# 背默 (Recital Dictation) — Original plan vs your revision

## Original plan (`Learning_Journey_Engine_v3.md` §3)

Units = **sentences** (from OCR line order). Ten steps, forgetting-curve spacing on steps 7–9.

| Step | Name | Goal | Games (current code) | Pass |
|------|------|------|----------------------|------|
| 1 | 閱讀理解 | Read + understand | READ / passage_study | 60% |
| 2 | 標記關鍵字 | Highlight keywords | HL, G2 | 70% |
| 3 | 填空缺字 | Cloze / missing word | G5, G13, G18 | 75% |
| 4 | 句子重組 | Sentence ordering | G6 | 75% |
| 5 | 單句默寫 | Sentence recall (no text) | G9 | 80% |
| 6 | 段落默寫 | Paragraph recall | G9 (one sentence/audio each) | 80% |
| 7–9 | 延遲回想 | 24h / 48h / 72h delay | G9 | 85–88% |
| 10 | 全文默 | Full passage from memory | full_recall | 90% |

**Design principle (spec):** Steps 1–9 are *teaching*; Step 10 alone judges **full-passage** reproduction (FOREVER_NOTES / FAMILYLINK §C).

---

## Your revision — progression 逐句 → 逐組句子 → 逐段 → 全篇

### Step 1 — Story first (口語化), always visible, shadowing

- Colloquial / joke-friendly **meaning intro** (not exam tone).
- **Full passage visible** — do not hide text in step 1.
- **Shadowing**: listen + read aloud chunk by chunk.
- Then **ascending interaction** while text stays on screen:
  - Tap / shoot popup options (G3, G2) **per sentence in OCR order**.
  - **Rearrange** chunked sentences (G6) — tiles shuffled for play, but **which chunk comes next** follows OCR sequence.
- Only **game type** is random; **content order** is not shuffled.

### Steps 2–4 — Chunking in OCR order (no content shuffle)

| Step | Granularity | Behaviour |
|------|-------------|-----------|
| 2 | **逐句** | One sentence at a time, OCR order; HL / match / tap |
| 3 | **逐句 cloze** | Missing word per sentence, OCR order |
| 4 | **逐組句子** | G6 reorder **pairs** of adjacent sentences, OCR order |

Passage may still show as reference on steps 2–4 (early 背默).

### Steps 5–10 — unchanged intent

- 5: single-sentence dictation (hidden text)
- 6: paragraph / multi-sentence audio dictation
- 7–9: delayed recall
- 10: full passage 全文默

---

## Consent note (play without save)

When `STRICT_DATA_CONSENT=true`, **writes** to materials, tracks, reviews, game-sessions, and progress-snapshot return 403 until parent email confirm. **Reads and play stay open**: generate-game, free-play, step-battle, friends, assignments, avatar unlock (device 💎).

Kids can invite friends, battle, upload worksheets, play steps 1–10 in-session, and buy skins — progress/tracks are not saved server-side, but features are **not locked**. Frontend shows informational toasts on odd journey steps (1, 3, 5, 7, 9) and on Settings/store when consent is pending.

---

## Content length bands (automatic — no profile / consent data needed)

Steps 2–4 adapt from **OCR sentence count + total length** in the current bundle:

| Band | When | Steps 2–4 |
|------|------|-----------|
| **Short** | ≤10 sentences and ≤420 chars (typical ~10-line 背默) | Step 2: **逐字 then 逐句** (G16/G18/G1 → HL/G2/G3, passage visible) · Step 3: 逐句 cloze (G5→G13→G18) · Step 4: **逐句** G6 (single sentence) |
| **Long** | More sentences or longer paragraph text | Step 2: **逐句** HL/G2/G3 · Step 3: 逐句 cloze · Step 4: **逐組** G6 (adjacent sentence pairs) |

Steps 5–10 unchanged. Each 背默 step deck is expanded **×1.5** per bundle (`JOURNEY_QUESTION_MULTIPLIER`).

---

## Code map

| File | Role |
|------|------|
| `backend/journey_engine.py` | `RECITATION_DICTATION_STEPS`, `generate_step_game`, `preserve_unit_order` |
| `backend/game_library.py` | `build_recital_step1_challenges`, `build_passage_study_challenge` |
| `frontend/.../BattlePage.jsx` | `passage_study` intro + `passage_visible` banner |
| `frontend/.../PreviewPage.jsx` | No Key Concepts panel (upload → preview → mode only) |
