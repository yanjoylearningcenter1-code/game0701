# Quick reference — updated after Cursor implementation pass

## Done in codebase

- LLM: `google-genai` + `GEMINI_API_KEY`
- Auth: Firebase + dev login (`DEV_AUTH_ENABLED=true`) — Emergent OAuth removed
- Images: local `frontend/src/assets/emergent/` (run `scripts/setup-windows.ps1`)
- Consent model + ParentalGate + Resend email service (`email_service.py`)
- P1: live classroom raids, Chinese challenges, streaks, parent email prefs
- Emergent badge/scripts removed from `frontend/public/index.html`

## You still configure

| Item | Action |
|------|--------|
| Python + Node + MongoDB | Run `scripts/setup-windows.ps1` or install manually |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) → `backend/.env` |
| Firebase production login | `FIREBASE_SERVICE_ACCOUNT_JSON` + `REACT_APP_FIREBASE_CONFIG` |
| Real emails | `RESEND_API_KEY` + verified `FROM_EMAIL` |
| Hosting | Railway/Fly + Vercel + MongoDB Atlas |

## Test command

```powershell
$env:REACT_APP_BACKEND_URL="http://localhost:8000"
cd backend
python -m pytest tests/ -v
```

Expect **36 tests** (29 original + 7 P1).

## Don't forget

- **Apple IAP** required for iOS in-app subs — see `docs/APPLE_IAP.md`
- **Education category** on App Store, not Kids Category (unless you accept IAP/analytics limits)
- Consent emails must actually send before treating parental consent as verifiable

See also `docs/APPLE_IAP.md` and full roadmap notes in your Downloads `FOREVER_NOTES.md`.

## Platform decision (2026-07-02) — confirmed, do not re-litigate without explicit user request

A separate strategy doc (`Learning_Journey_Engine_v3_完整版.md`, copied to `docs/Learning_Journey_Engine_v3.md`)
proposed a possible React Native/Expo + Supabase rewrite. **Explicitly rejected.** Decision:

- **Keep** FastAPI + MongoDB backend, and the existing React (CRA/craco) web frontend — no port to Supabase, no rewrite in React Native/Flutter.
- **Add Capacitor** to wrap the existing web app into native iOS + Android shells (this matches v3 Section 15.1's own recommendation: "Capacitor/PWA 包裝係三條路入面最貼近現有資源嘅選擇").
- Native camera access via Capacitor's `@capacitor/camera` plugin (replacing/augmenting the plain `<input type=file capture>` HTML fallback).
- Push notifications via `@capacitor/push-notifications`.
- iOS builds require Xcode → **Mac only**, cannot build/run the iOS app from this Windows machine. Can still generate/maintain the `ios/` Capacitor project here; someone needs a Mac (or Mac-in-cloud CI) to open Xcode and archive/submit.
- Android builds need Android Studio/SDK + Java — can be done on Windows once installed.

## Key ideas from v3 doc worth remembering (product logic, not yet all built)

- **Four tracks are one Memory Consolidation Curve, not four modes**: 讀默 (word-level) / 背默 (sentence-level) / 測驗 (concept-level) / 考試 (multi-topic retrieval-under-pressure) all just manage `knowledge_unit`s at different granularity, and can run concurrently per student.
- **Dynamic forgetting-curve scheduling already implemented**: `sm2_update()`, `compute_memory_strength()`, `compute_urgency_tier()` / `is_cram` / `lead_time_days` all exist in `backend/server.py` — this is the moat (see Section 15.2: the defensible asset is the longitudinal per-unit memory-strength data, not the game loop, which AI can copy trivially).
- **Not yet built** (candidates for next roadmap pass, not started this session):
  - AI Daily Task Engine that scans all active knowledge units across tracks and assembles one daily 5–15min queue (Section 7.2 / 9 `daily_task_queue`).
  - Explicit Survival/SOS mode UI for lead_time < ~2hrs (Section 11) — backend has urgency tiers but no dedicated "SOS" triage flow/UI yet.
  - Self-initiated (`self_practice`, no due date, lower priority) track type distinct from teacher/parent-assigned tracks (Section 12).
  - Teacher Dashboard class-wide Memory Strength heatmap (Section 8.3) — intentionally deferred per the doc itself until core loop retention is validated.
  - Viral/share hooks (boss-card share, invite-a-friend) — Section 15.4, currently zero.
  - COPPA/GDPR-K/PDPO-grade consent + de-identification pipeline — Section 15.2; current consent flow is a first step only, not IRB-grade.
- Kid-facing UI must never show raw memory_strength %, weak-topic lists, or behavioral rationale text — only Parent/Teacher views get raw numbers (Section 14). Keep enforcing this server-side via token role, not just hiding it in the frontend.

## Code-vs-doc gap audit (2026-07-02) — verified against actual files, not assumed

Went through v3 doc section-by-section against the real codebase. Full detail in chat; headline findings:

**Genuinely missing / broken (confirmed by reading the files):**
- **No role-free "golden 30 seconds" entry.** `LandingPage` → "Start Adventure" → `/identity` (`IdentitySelectionPage.jsx`) forces a 學生/家長/老師 role pick before *any* play — directly violates v3 Section 13.1–13.2. `ParentalGate.jsx` (math-question speed bump) already exists but is only wired to `/parent` and `/teacher` routes, not used as the landing-page gate. **Fix plan:** "Start Adventure" → straight to `/upload` (Kid Mode default); move Parent/Teacher entry behind a small corner link that opens `ParentalGate` first.
- **No System 5-Lite (typing input).** All 5 challenge types in `server.py` (`tap`, `drag`, `memory_flash`, `idiom_repair`, `stroke_order`) are multiple-choice/tile-based — there is no free-text typing challenge anywhere. Real 默書 requires typing from a spoken prompt with no visual hint; current implementation never does this.
- **No `self_practice` track type.** `ModeSelectionPage.jsx` always forces one of the 4 track types + always creates a `LearningTrack` with a due date flow. `FreePlayPage.jsx` is track-less but *also* doesn't persist any `knowledge_unit`, so self-initiated study currently either commits to full deadline pressure or doesn't feed the forgetting-curve engine at all.
- **FamilyLink doesn't actually route parent-assigned homework to a kid.** `FamilyLink` model exists (`server.py`) but is only used in the parental-consent-request lifecycle. When a parent creates a track while logged in, `owner` = the parent's own `user_id` (via `get_owner_id`) — there is no mechanism connecting that track to a specific linked kid's device. "Parent assigns homework, kid sees it" is not wired end-to-end. **See `FAMILYLINK_SPEC_v1.0.md` + `FAMILYLINK_AMENDMENT_v1.1.md` for the agreed fix (below).**
- No per-track readiness rings on Kid Home (Section 8.1) — only one aggregate boss/energy status.
- No class-wide roster/readiness list on Teacher Dashboard, no viral/share hooks (Section 15.4), no IRB-grade consent pipeline (Section 15.2 advanced part).

**Turns out already implemented (don't rebuild — verified in code):**
- Forgetting curve engine (SM-2, `compute_memory_strength`, urgency tiers) — solid.
- Section 7.1 assign type+scope+due-date flow — `ModeSelectionPage.jsx` already does this.
- Section 7.4 world theme by urgency/readiness tier — `TIER_WORLD_STATE` in `ModeSelectionPage.jsx`.
- Section 10.1/10.2 Expanding Retrieval sequencing (emergency tier) — `_expanding_retrieval_order()` in `server.py`, a real interleaving algorithm, not just copy.
- Section 11.3 Rapid Loop massed-practice sequencing (survival tier) — `_rapid_loop_order()`, plus tone-controlled LLM prompting ("SOS Mission", never mention lack of time).
- Section 14 kid-safe data exposure — verified: `KidHomePage`/`VictoryPage` never show raw `%` or `weak_units`; `ParentDashboard` correctly shows raw readiness % + named weak units.

## Agreed priority order for remaining work (confirmed 2026-07-02, do not re-litigate)

1. Role-free golden-30-seconds entry fix (cheap, high leverage, test every later change against this)
2. System 5-Lite typing input (核心承諾缺口 — 默書唔應該淨係MC)
3. FamilyLink routing — see spec files below
4. `self_practice` track type (third branch alongside teacher/parent-assigned, once #3 routing exists)
5. Daily Task Engine per-track UI (backend endpoint already exists — just frontend rendering)
6. Viral/share hooks
7. Teacher roster/readiness list (simple version; doc itself defers the full heatmap)
8. IRB-grade consent (only matters once talking to schools/researchers)

## FamilyLink + 讀默/背默 definition spec — FINAL (v1.0 + v1.1 amendment combined)

Full text saved at `docs/FAMILYLINK_SPEC_v1.0.md` and `docs/FAMILYLINK_AMENDMENT_v1.1.md`. **v1.1 amends v1.0's Section A.5 and adds A.6 — v1.1 is authoritative for those parts.** Sections A.1–A.4 (data model, room-code-style linking flow, edge cases), B (讀默 step definitions), and C (背默 step definitions) are unchanged from v1.0.

**Data model:** `kid_device` (persistent `kid_device_id`, not session-scoped — same identity across app restarts), `family_code` (6-digit, generated like `room_code`), `family_link` (many-to-many `parent_id` ↔ `kid_device_id`, `permission_level`).

**Two coexisting linking flows** (this is the key synthesis point between v1.0 and v1.1):
1. **Parent-initiated, in-person** (v1.0 A.3): parent physically holds the kid's device, passes `ParentalGate`, sees the Family Code themselves, later enters it in their own Parent Dashboard → link is immediately active, no separate consent-email step (the parent already acted directly).
2. **Either-party-initiated, remote** (v1.1 A.5, replaces v1.0's "kid can never initiate" rule): a neutral, non-gamified "Link a parent account" option in Settings (same visual weight as other settings, no badges/nudges/rewards) — either side can trigger this by entering the parent's email → `POST /family-links/invite` creates a **pending** `family_link` + **pending** `consent_record` → email sent via the existing consent-email path → link only goes active when the parent clicks the emailed confirm link (`GET /consent/confirm?token=`). Backend must reject any attempt to set `family_link.status`/`consent_record.granted` through any other path.

**Three hard guardrails on the invite UI (v1.1 A.5.2), regardless of who initiates:**
- Entry point must be neutral/boring (Settings-page style), never gamified, never a nudge/CTA/badge/popup on Kid Home Hub.
- Kid-initiated invite requires independent parent email confirmation — never resolves via anything the kid can tap themselves.
- No "unlinked" status may ever pressure the kid (no nagging copy, no feature-gating of `self_practice` tracking based on link status, no read-receipt/pending-status visibility to the kid).

**New legal requirement not in v1.0 (v1.1 Section A.6, UK ICO Children's Code Standard 11 / UK GDPR Article 25(1), binding law since 2025-06-19):** whenever a kid has ≥1 active `family_link`, Kid Home Hub must permanently display a neutral (non-alarming) monitoring-disclosure icon (👨‍👩‍👧) explaining in age-appropriate language that a parent can see their progress. `GET /home-status` gets a new `family_link_count` field (count only — never parent identity/email, per Section 14's kid-token restrictions).

**Homework routing fix:** once linked, `track.student_id` = the linked `kid_device_id` (not the parent's own account id), and the kid's `daily_queue` fetch filters `WHERE student_id = own kid_device_id` — so parent-assigned tracks and the kid's own `self_practice` tracks naturally merge into one queue.

**讀默 (Section B) definition correction:** real dictation is teacher-read-aloud, testing ~80% of taught items in randomized order (not all items, not original order) — Step 5 onward must switch from visual (text/image) prompts to **audio-only** prompts, and Step 10 Ready Check must sample ~80% shuffled, not drill all items in original order. Stroke-order animation added as a non-scored *teaching aid* in Steps 1–4 only (typing input remains the only scored/graded mechanism — no handwriting recognition, that decision stands).

**背默 (Section C) definition correction:** Step 10 Ready Check must validate full-passage reproduction, not partial-sentence checks — segmented practice in Steps 1–9 is a teaching method only, not a lowered final bar.

## International compliance + App Store strategy (2026-07-02, user research)

**Reference pattern (TikTok / YouTube Kids / Roblox / Duolingo):** one binary, region-parameterized consent flows — not separate apps per country. Detect region via App Store locale + IP geolocation at runtime, then activate the correct consent/age rules.

**App Store category decision (recommended):** list under **Education** with General/Made for Ages 4+ audience rating + internal age gating — **avoid Apple's Kids Category** unless we need Kids Category ad/analytics restrictions anyway. Duolingo-style: Education category + backend COPPA compliance + parental consent, sidesteps Apple's strictest Kids Category ad/analytics lockdown while still meeting COPPA at the server layer.

**Parameterized rules engine (build once, tune per region):**
- `region_profile`: US (COPPA 13), UK (AADC + UK GDPR Art 25), HK (PDPO), EU (GDPR-K age 13–16 varies by member state)
- `age_of_consent`: lookup table by detected region
- `consent_flow`: Email Plus (COPPA §312.5) for kid-initiated parent invite; verifiable parental consent for data collection; token-only email confirm path (already stubbed)
- `monitoring_disclosure`: UK ICO Standard 11 — mandatory neutral icon when family_link active (v1.1 A.6)
- `feature_flags`: disable personalized ads everywhere for under-13; no behavioral profiling for kids

**COPPA "actual knowledge":** app is explicitly educational for kids → treat as child-directed; don't rely on "we didn't ask age" defense. Internal age gate + parental consent is the viable path.

**FamilyLink implementation follows v1.1** — geolocation doesn't change the FamilyLink UX, but it determines which consent strings/legal copy and which age thresholds apply when the invite/consent flow runs.

**Pre-launch blockers for international:** real email provider (Resend) for consent emails; privacy policy + terms per region; App Store privacy nutrition labels; data deletion endpoint (already exists at `/api/data/delete`).
