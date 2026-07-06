# Overnight Backlog — Implementation Checklist

Last updated: 2026-07-06 (launch stack pass)

## Launch stack (2026-07-06)

| Area | Status |
|------|--------|
| Capacitor App Store build | ✅ `scripts/build-native.ps1`, `npm run cap:sync/ios/android`, `com.cramjourney.app` |
| IAP (RevenueCat) | ✅ SDK + `/iap/*` + ParentDashboard purchase/restore |
| Teacher billing/seats | ✅ Backend + TeacherDashboard billing card |
| Viral share | ✅ KidHome, ParentDashboard, Victory (+ boss card 🏆) |
| Kid pending-until-consent | ✅ Gate + banner + Settings + 403 toasts; QA doc `docs/CONSENT_E2E_QA.md` |
| Privacy / lawyer | 🟡 EN draft + checklist — **counsel sign-off still required** |

See `docs/LAUNCH_BLOCKERS.md` for production gates.

---

Legend: ✅ Done · 🟡 Partial / needs manual QA · ❌ Blocked (needs Apple keys / production infra)

---

## A. DONE items — verify, polish, complete gaps

| Item | Status | Notes |
|------|--------|-------|
| Migration/P1 skeleton verification | ✅ | `test_p1_features.py`, classroom raid endpoints |
| G1–G20 wired in BattlePage per journey_engine | ✅ | Distinct components per game type |
| Victory page | ✅ | Journey pass/fail, sfx.victory(), share button |
| FamilyLink core | ✅ | by-code, invite, orphan detection, monitoring icon |
| kidMode | ✅ | `enableKidMode()` on landing/home |
| segment API | ✅ | `/materials/segment` word/sentence/paragraph |
| partial i18n → full | 🟡 | EN default + zh-HK 書面語; Battle/Upload wired this pass |

---

## B. PARTIAL (~35) — completed this pass

| Item | Status | Notes |
|------|--------|-------|
| G18/G4 grading trad+simp | ✅ | `cjkVariants.js` + `answersEquivalent` in tts.js |
| G20 Rescue timer/lives | ✅ | `RescueGame.jsx` with timer bar + lives |
| Boss HP=0 ends game | ✅ | `onCorrect` → `finishSession` when bossHp≤0 |
| 20Q vs HP balance | ✅ | boss_max_hp = len(challenges)×18; perQ dmg scales |
| combo/score reset per step | ✅ | `loadFreshGame` resets; remix resets combo only |
| no end on 2 wrong | ✅ | playerHp floors at 15; session ends on deck exhaust |
| remix loop | ✅ | missed items replay once |
| Step 1 = recognize (G1/G16 not dictation) | ✅ | journey_engine step 1 game_options |
| TypoHunter reference modal UI | ✅ | G10 reference modal in TapChoiceGame (this pass) |
| distinct UI per game | ✅ | Separate components + TapChoiceGame themes |
| yellow bar/combo carry fix | ✅ | progress uses initialDeckSizeRef; combo reset on remix |
| OCR `/materials/clean` | ✅ | LLM + fallback; `ocrClean.js` |
| quick battle skip preview | ✅ | `quick_battle` flag → `/transform` |
| 詞語/句子/段落 split | ✅ | PreviewPage structure picker + segment API |
| no nag banner | ✅ | continue banner only when saved battle exists |
| loading animation | ✅ | UploadPage scan phases |
| raw_ocr stored | ✅ | sessionStorage `raw_ocr_text` |
| segment quality concatenated worksheets | ✅ | CJK greedy + LLM fallback |
| FamilyLink parent data gated | ✅ | `_require_parent_child_link` |
| family code flow | ✅ | FamilyCodePage + by-code endpoint |
| multi-child dropdown | ✅ | ParentDashboard select child |
| parent assign → kid device owner | ✅ | `student_id` = kid_owner_id |
| remote invite Settings | ✅ | `/family-links/invite` |
| monitoring icon modal z-index | ✅ | KidHomePage z-50 modal |
| Start Adventure after parent visit | ✅ | Landing → `/upload` no forced identity |
| i18n English default | ✅ | `getUiLang()` defaults `en` |
| FULL app 繁體書面語 | 🟡 | ~800 keys; some battle sub-prompts remain EN in zh mode |
| KidProfile, Skills, Journey, Battle, Victory | 🟡 | Battle wired this pass; spot-check others |
| Social display name + profanity | ✅ | `_contains_profanity` filter |
| friend ID search/add | ✅ | LeaderboardPage |
| Premium parent toggle + copy | ✅ | ParentDashboard premium card |
| child points to parent | ✅ | Settings premium hint |
| coins tooltip | ✅ | KidHomePage title attr |
| note IAP coming | ✅ | `parent_premium_iap_note` |
| Teacher room expiry | ✅ | expiry options on raid create |
| calendar i18n | 🟡 | CalendarView uses t(); verify labels |
| delete track icon | ✅ | JourneyTrackCard 🗑 |
| calendar contrast | 🟡 | ParentDashboard calendar — manual visual QA |
| StudentRaid useCallback | ✅ | `refresh` wrapped in useCallback |
| Victory sfx | ✅ | `sfx.victory()` on pass/defeat |

---

## C. NOT STARTED (~25) — code-feasible items

| Item | Status | Notes |
|------|--------|-------|
| Golden 30s landing flow | ✅ | Landing → `/upload`; parent/teacher via `/identity` |
| self_practice persist units | ✅ | track_type=self_practice, no due date |
| Daily Task Engine UI rings | ✅ | KidHome `/daily-queue` track_rings |
| Viral share boss card | ✅ | Victory + KidHome share via `share.js` |
| Teacher roster readiness % | ✅ | TeacherDashboard roster from heatmap API |
| SOS/Survival UI banner | ✅ | KidHome urgency_tier banner |
| Stroke order non-scored steps 1–4 | ✅ | StrokeOrderTeach button in BattlePage |
| Bundle split >12 units | ✅ | `split_into_bundles` in journey_engine |
| Step-back after N failures | ✅ | `step_back_on_fail` + game-session handler |
| Push notifications Capacitor stub | ✅ | `push.js` + `/push/due-reminder` |
| 8.1 Kid Dashboard rings + queue | ✅ | KidHomePage daily-queue |
| 8.2 Parent assign form polish | 🟡 | AssignTargetPage functional; UX polish optional |
| 8.3 Teacher heatmap i18n | 🟡 | Labels in i18n; verify live data |
| 8.4 Exam journey 11 steps | ✅ | EXAM_STEPS + test |
| Listen mode per step | ✅ | game_library profile + BattlePage |
| 背默 Step 10 full passage threshold | ✅ | FULL_RECALL_PASS_THRESHOLD |
| 讀默 Step 10 80% shuffle | ✅ | final_sample + `_apply_dictation_sampling` |
| Compliance consent email templates | ✅ | Bilingual HTML in email_service (this pass) |
| Apple IAP UI placeholder | ✅ | No Stripe; docs/APPLE_IAP.md |
| Capacitor config intact | ✅ | frontend/capacitor.config.json |
| Reference games wired | ✅ | TypoHunter/G10, FillBlank, SpeedGrid, LogicOrder, BubblePop, TargetWordHunt |
| Resend graceful no key | ✅ | `[email stub]` log when no RESEND_API_KEY |
| Tests segment/clean/g18/family | ✅ | `test_overnight_backlog.py` (9 tests) |
| Apple IAP real purchases | ❌ | Needs App Store Connect keys |
| Production push (FCM/APNs prod) | ❌ | Needs native certs |
| Real Stripe / web payments | ❌ | Explicitly excluded per spec |

---

## Files touched this overnight pass

- `backend/game_library.py` — G10 reference sentence for TypoHunter modal
- `backend/email_service.py` — bilingual consent + digest templates
- `backend/tests/test_overnight_backlog.py` — new tests (9 passing)
- `frontend/src/components/games/TapChoiceGame.jsx` — G10 reference modal
- `frontend/src/pages/BattlePage.jsx` — i18n, combo reset on remix
- `frontend/src/pages/UploadPage.jsx` — resume banner i18n
- `frontend/src/lib/i18n.js` — battle + G10 keys

---

## Top 10 manual QA when you wake up

1. **Landing Golden 30s** — tap Start Adventure → lands on Upload with no login wall
2. **G10 Typo Hunter** — play exam step 8 error review; tap "View reference text" modal
3. **G20 Rescue** — reading step 3/4; verify timer bar + lives decrement
4. **Boss dies before last Q** — quick 5-word battle; boss HP should hit 0 near final question
5. **Remix loop** — miss 2 items; remix round should reset combo but keep score
6. **Family link** — kid shows family code; parent links via Parent Portal
7. **i18n toggle** — Settings → 繁體中文; Battle exit/resume/break dialogs should translate
8. **OCR clean + segment** — upload concatenated CJK worksheet; split as 詞語 then preview
9. **Exam 11 steps** — create exam track; Journey map shows steps 1–11
10. **Victory share** — finish battle; share button copies invite with public ID

---

## Test command

```bash
cd backend && python -m pytest tests/ -q
```

Expected: all tests pass including `test_overnight_backlog.py`.
