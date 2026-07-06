# Launch blockers & marketing honesty (2026-07-06, updated)

## Implemented in this pass

| Area | Status |
|---|---|
| Capacitor build | `scripts/build-native.ps1`, `npm run cap:sync` / `cap:ios` / `cap:android`, `capacitor.config.json` → `com.cramjourney.app` |
| IAP (RevenueCat) | `@revenuecat/purchases-capacitor`, `/iap/config`, `/iap/sync`, webhook stub; ParentDashboard buy/restore |
| Teacher billing | `/teacher/billing`, plan upgrade, seat limits on classroom join; TeacherDashboard billing card |
| Viral share | `share.js` hooks; KidHome boss invite, ParentDashboard invite, VictoryPage share + boss card |
| Kid consent gate | `consent_gate.py` on learning writes; banner, Settings status, 403 toasts on battle/track save |
| Privacy policy | EN draft + ZH reference, `/privacy`, login checkbox; **lawyer sign-off still required** |

## Still blocked for production launch

1. **Lawyer review** — complete `docs/legal/LEGAL_REVIEW_CHECKLIST.md` sign-off. AI drafts are not legal advice.
2. **Resend in production** — without `RESEND_API_KEY`, consent emails are log-only stubs.
3. **Firebase production** — `REACT_APP_FIREBASE_CONFIG` + disable `DEV_AUTH_ENABLED`.
4. **App Store Connect** — create IAP products matching env IDs; RevenueCat keys in backend.
5. **E2E QA** — run `docs/CONSENT_E2E_QA.md` on staging with real email.
6. ~~**Emergent sync**~~ — ✅ approved 2026-07-06 (`docs/G1-G20-SYNC-PENDING.md`)

## What you can honestly market after lawyer + Resend + store submit

- Journey battles G1–G20, SM-2 scheduling, OCR → battle
- Parent premium subscription (native IAP)
- Teacher classroom/school plans with seat limits
- Verifiable parental consent (pending-until-email-confirm)
- Share invite / boss card (Web Share API + clipboard fallback)

## What not to claim until verified

- “Lawyer-approved privacy policy” (until checklist signed)
- “Available on App Store” (until review passes)
- IRB-grade research consent pipeline (behavioral/research consents are separate, partial)

## Game UX (prior pass — unchanged)

Memory flash bar, tap-one-shot, passage study step 1, G13 context cloze, 30s streak-save, etc.
