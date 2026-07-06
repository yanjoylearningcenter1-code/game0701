# Kid profile “pending until email confirm” — E2E QA

Run on **staging** with `STRICT_DATA_CONSENT=true`, `RESEND_API_KEY` set, and `APP_BASE_URL` pointing at staging web.

## Setup

1. Backend: `STRICT_DATA_CONSENT=true`, valid Resend keys
2. Fresh kid device: clear localStorage / use incognito or new install
3. Parent account: Firebase login or dev-login with role `parent`

## Flow A — Kid invites parent (Settings)

| Step | Action | Expected |
|---|---|---|
| 1 | Kid opens `/settings`, enters parent email, taps invite | Toast success; `POST /family-links/invite` 200 |
| 2 | Check email inbox | Consent email with link to `/consent/confirm?token=…` |
| 3 | Kid opens `/home` | `ConsentPendingBanner` visible; `data_consent.status` = `pending` |
| 4 | Kid completes a battle | Battle plays; `POST /game-sessions` returns **403** `consent_required` |
| 5 | Victory screen | Toast + link to Settings; no streak/diamonds persisted server-side |
| 6 | Parent clicks email link (logged in as parent) | `/consent/confirm` success |
| 7 | Kid refreshes `/home` | Banner gone; `data_consent.status` = `active` |
| 8 | Kid completes battle again | `POST /game-sessions` **200**; streak updates |

## Flow B — Parent-initiated consent

| Step | Action | Expected |
|---|---|---|
| 1 | Parent links kid via family code | Family link active |
| 2 | Parent dashboard → request `data_collection` consent | Email sent |
| 3 | Before confirm: kid upload → track create | **403** on `/tracks` or `/materials`; redirect Settings |
| 4 | After confirm | Upload + track save succeed |

## Flow C — Legacy dev bypass (local only)

| Step | Action | Expected |
|---|---|---|
| 1 | Set `STRICT_DATA_CONSENT=false` | `home-status.data_consent.status` = `legacy_open` |
| 2 | Kid saves without consent | Writes allowed (dev convenience only) |

## API spot checks

```bash
# Pending kid — should 403
curl -X POST "$API/game-sessions" -H "X-Guest-Id: $KID_ID" -H "Content-Type: application/json" \
  -d '{"mode":"quiz","score":10,"correct":1,"wrong":0,"unit_ids":[]}'

# home-status includes data_consent
curl "$API/home-status" -H "X-Guest-Id: $KID_ID"
```

## Regression

- [ ] Parent premium IAP still works after consent active
- [ ] Teacher seat join blocked at limit (402) independent of kid consent
- [ ] Privacy policy link on login and settings opens `/privacy`

## Automated tests (backend unit)

```bash
cd backend && python -m pytest tests/test_consent_gate.py tests/test_teacher_billing.py -q
```

Integration tests against live server require consent or `STRICT_DATA_CONSENT=false`.
