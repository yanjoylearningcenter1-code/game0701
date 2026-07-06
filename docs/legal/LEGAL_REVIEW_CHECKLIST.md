# Legal review checklist — before App Store / Play launch

**Status: NOT lawyer-approved.** This checklist is for your counsel. AI-generated policy text is a draft only.

## Required deliverables for counsel

- [ ] **English privacy policy** — `docs/legal/privacy-policy-EN.md` (authoritative)
- [ ] **Chinese reference** — `docs/legal/privacy-policy-ZH.md`
- [ ] **In-app URL** — `/privacy` serves policy from `frontend/public/legal/`
- [ ] **Terms of use** — not yet drafted; counsel should provide or review
- [ ] **App Store Privacy Nutrition Label** — must match actual data flows below

## Facts counsel must verify against the running product

| Topic | Current implementation | Counsel question |
|---|---|---|
| Child data gate | `STRICT_DATA_CONSENT=true` blocks `/materials`, `/tracks`, `/reviews`, `/game-sessions` until `data_collection` consent granted | Does two-step email link satisfy COPPA / PDPO verifiable consent? |
| Consent email | Resend when `RESEND_API_KEY` set; otherwise log-only stub | Is log-only acceptable in staging only? |
| Pending profile UX | KidHome banner + Settings status + 403 toast on save | Is "pending until email confirm" wording accurate? |
| AI processing | Text/images sent to Google Gemini for worksheet/game generation | Data processing agreement / children's data clause with Google? |
| Auth | Firebase Google sign-in + device guest id for kids | Cross-border transfer disclosures correct? |
| IAP | RevenueCat + Apple/Google billing for premium + teacher plans | Subscription terms, refund policy, restore purchases copy |
| Teacher seats | MongoDB seat limits per plan | B2B contract vs consumer IAP distinction for schools |
| Analytics | Minimal; no ad profiling claimed | Confirm no third-party ad SDKs in native build |
| Deletion / export | Endpoints exist — must be QA'd with real accounts | SLA in policy ([X] days) must match engineering |

## Pre-launch engineering gates (not legal, but block honest marketing)

- [ ] `RESEND_API_KEY` + verified `FROM_EMAIL` in production
- [ ] `APP_BASE_URL` points to production web URL (consent links)
- [ ] `REACT_APP_FIREBASE_CONFIG` in production frontend build
- [ ] `DEV_AUTH_ENABLED=false` in production backend
- [ ] RevenueCat product IDs match App Store Connect / Play Console
- [ ] Run **`docs/CONSENT_E2E_QA.md`** checklist on staging
- [ ] Lawyer sign-off recorded (name, date, version hash of policy files)

## Sign-off (fill in after counsel review)

| Field | Value |
|---|---|
| Counsel name / firm | |
| Review date | |
| Policy version (git SHA or date) | |
| Approved for HK only / international | |
| Notes | |

**Do not ship to production users until the sign-off row is completed.**
