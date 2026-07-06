# Apple IAP & Monetization Research Notes

## Critical rule

If you sell **digital subscriptions or unlocks inside the iOS app**, Apple **requires In-App Purchase (IAP)**. You **cannot** use Stripe checkout inside the iOS binary for consumer digital goods.

## What is allowed where

| Channel | Payment method |
|---------|----------------|
| iOS app (consumer sub) | Apple IAP only (15–30% fee) |
| Web app (same account) | Stripe OK |
| School B2B contract | Stripe Invoicing / bank transfer — outside app |
| Android (Play Store) | Google Play Billing |

## Recommended stack for solo founder

1. **RevenueCat** — Capacitor plugin; one SDK for Apple + Google receipt validation
2. **Server-side entitlements** — store `subscription_tier: free | premium` per user in MongoDB
3. **Gate features, not core loop** — free: 1 active track + core battles; premium: unlimited tracks + parent analytics history

## App Store category

Ship under **Education**, not **Kids Category**, unless ready to drop third-party analytics and most external links. Use ParentalGate + age-appropriate privacy policy.

## Before writing subscription UI

- [ ] Apple Developer Program ($99/yr)
- [ ] Google Play Console ($25 one-time)
- [ ] RevenueCat account + product IDs in App Store Connect
- [ ] Lawyer-reviewed privacy policy URL (`docs/legal/LEGAL_REVIEW_CHECKLIST.md`)
- [ ] Privacy Nutrition Label matches actual data collection (consent model, streaks, emails)

## Product IDs (defaults in backend)

| Product | Env var | Default ID |
|---------|---------|------------|
| Parent premium monthly | `IAP_PRODUCT_PREMIUM` | `cram_premium_monthly` |
| Teacher classroom | `IAP_PRODUCT_TEACHER_CLASS` | `cram_teacher_classroom_monthly` |
| Teacher school | `IAP_PRODUCT_TEACHER_SCHOOL` | `cram_teacher_school_monthly` |

Backend exposes public SDK keys via `GET /api/iap/config` (iOS/Android RevenueCat keys only — never webhook secret).

## Native build

```powershell
.\scripts\build-native.ps1
# or from frontend/
npm run cap:ios
npm run cap:android
```

Set `REACT_APP_BACKEND_URL` to production API before release build.

## Client code

- `frontend/src/lib/iap.js` — RevenueCat wrapper
- `frontend/src/pages/ParentDashboard.jsx` — premium purchase / restore
- `frontend/src/pages/TeacherDashboard.jsx` — plan upgrade (IAP on native, manual POST on web)

## References

- [App Store Review Guideline 3.1.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)
- [RevenueCat Capacitor](https://www.revenuecat.com/docs/getting-started/installation/capacitor)
