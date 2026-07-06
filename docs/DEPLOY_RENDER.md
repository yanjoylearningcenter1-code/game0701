# Deploy to Render (staging)

You need **two** Render services from the same GitHub repo — not one.

| Service | Root directory | URL example |
|---------|----------------|-------------|
| **Backend (API)** | `backend` | `https://game0701-api.onrender.com` |
| **Frontend (static)** | `frontend` | `https://game0701-web.onrender.com` |

Your failed deploy at `https://game0701.onrender.com` was almost certainly the **frontend** build (yarn + React). The logs you pasted stop at install warnings — the real errors are usually:

1. `CI=true` → ESLint warnings fail the build
2. `@revenuecat/purchases-capacitor` missing on web (fixed in repo via stub alias)

---

## Option A — Fix your existing Render service

### If this is meant to be the **frontend**

Render Dashboard → your service → **Settings**:

| Setting | Value |
|---------|--------|
| **Root Directory** | `frontend` |
| **Runtime** | Static Site (or Node if static not available) |
| **Build Command** | `yarn install --frozen-lockfile && yarn build` |
| **Publish Directory** | `build` |

**Environment variables** (Environment tab):

```
NODE_VERSION=20
CI=false
DISABLE_ESLINT_PLUGIN=true
GENERATE_SOURCEMAP=false
REACT_APP_BACKEND_URL=https://YOUR-BACKEND-URL.onrender.com
```

Redeploy → **Manual Deploy** → Clear build cache & deploy.

### If this is meant to be the **backend**

Change completely:

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |

**Environment variables** (use your existing MongoDB Atlas string):

```
MONGO_URL=mongodb+srv://USER:PASS@cluster....mongodb.net/?retryWrites=true&w=majority
DB_NAME=cram_journey
GEMINI_API_KEY=your_key
APP_BASE_URL=https://YOUR-FRONTEND-URL.onrender.com
CORS_ORIGINS=https://YOUR-FRONTEND-URL.onrender.com
DEV_AUTH_ENABLED=true
STRICT_DATA_CONSENT=true
```

Health check: `/api/`

---

## Option B — Blueprint (both services at once)

1. Push latest code (includes `render.yaml`)
2. Render → **New** → **Blueprint**
3. Connect `yanjoylearningcenter1-code/game0701`
4. Fill secret env vars when prompted (`MONGO_URL`, `GEMINI_API_KEY`, etc.)

---

## MongoDB Atlas

If you already created Atlas + `0.0.0.0/0` access and have the connection string — **reuse it**. Paste into backend `MONGO_URL` only. No need to recreate.

---

## After both are live

1. Frontend `REACT_APP_BACKEND_URL` = backend URL (no trailing slash)
2. Backend `APP_BASE_URL` + `CORS_ORIGINS` = frontend URL
3. Open frontend URL → upload → battle
4. Backend test: `https://game0701-api.onrender.com/api/` → `{"ok":true,...}`

---

## Push code fix

```powershell
git add frontend/craco.config.js frontend/src/lib/iap-capacitor-stub.js render.yaml docs/DEPLOY_RENDER.md
git commit -m "Fix Render web build: IAP stub, CI eslint, deploy config"
git push
```

Then redeploy on Render.
