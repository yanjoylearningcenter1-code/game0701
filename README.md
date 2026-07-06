# AI Cognitive Adventure Learning Platform

Homework → OCR → AI boss battle. React 19 frontend + FastAPI/MongoDB backend.

## Prerequisites

- **MongoDB** running on `mongodb://localhost:27017` (required for most API routes and all DB tests)
  - Option A: `winget install MongoDB.Server` then start the MongoDB service
  - Option B: `docker compose up -d` (see `docker-compose.yml` in project root)
  - Option C: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier — paste `MONGO_URL` into `backend/.env`
- Python 3.12+ (installed via `scripts/setup-windows.ps1` or winget)
- Node.js LTS + yarn

## Backend

```bash
cd backend
pip install -r requirements.txt
# Edit .env: GEMINI_API_KEY, optional RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

**Local auth (no Firebase yet):** `DEV_AUTH_ENABLED=true` in `backend/.env` — use Dev Sign In on `/login`.

**Production auth:** Set `FIREBASE_SERVICE_ACCOUNT_JSON` (full service account JSON string) and `REACT_APP_FIREBASE_CONFIG` in `frontend/.env`.

## Frontend

```bash
cd frontend
yarn install
# Hero images already in src/assets/emergent/ — or run: bash scripts/download-emergent-assets.sh
yarn start
```

Open http://localhost:3000 — set `REACT_APP_BACKEND_URL=http://localhost:8000`.

## Tests

Start backend + MongoDB, then:

```bash
cd backend
REACT_APP_BACKEND_URL=http://localhost:8000 python -m pytest tests/ -v
```

Expect 36+ tests (29 original + P1 feature tests).

## Key env vars

| Variable | Where | Purpose |
|----------|-------|---------|
| `GEMINI_API_KEY` | backend/.env | AI game generation |
| `DEV_AUTH_ENABLED` | backend/.env | Local teacher/parent login |
| `RESEND_API_KEY` | backend/.env | Consent + progress emails |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | backend/.env | Google login verification |
| `REACT_APP_FIREBASE_CONFIG` | frontend/.env | Firebase client SDK |

## New features (P1)

- Live classroom raids (`/join`, `/teacher/raid/:code`, WebSocket sync)
- Chinese challenges: `idiom_repair`, `stroke_order`
- Daily streak (`GET /api/streak`, home HUD)
- Parent progress emails (`/follow-ups/email-preferences`)
- Firebase auth (replaces Emergent OAuth)
- Consent/privacy endpoints + ParentalGate

See `docs/APPLE_IAP.md` before building subscriptions.
