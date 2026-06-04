# Hisab — Personal Expense Tracker

Track money you receive from someone (e.g. your brother hands you ₹1,50,000 for ~20–35
transactions over 4 days), log every expense against it, and generate a clean printable
**Hisab statement** showing exactly where the money went and how much is left.

- **Ledgers** — one batch of money received (from whom, amount, purpose, expected number of
  transactions, deadline).
- **Expenses** — each spend drawn from a ledger (amount, description, category, date,
  important flag, note).
- **Hisab statement** — print-friendly page → browser *Save as PDF* to share.
- **History** — search/filter all transactions across ledgers.
- **Backup** — export/import the whole dataset as JSON.

## Tech
React + Vite + Tailwind frontend, served by a small **Express** API server, with data in
**Neon Postgres** (free serverless Postgres — data persists permanently, surviving every
restart and redeploy).

It runs as **one web service**: the Express server serves both the built React app and a
REST API under `/api/*` on the same origin. Access is gated by a single shared password.

```
Browser ── /            → built React app (dist/)
        ── /api/*        → Express REST API ── Neon Postgres
        ── /healthz      → uptime ping (keep the free service awake)
```

---

## Environment variables
| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `APP_PASSWORD` | Shared password to unlock the app (sent by the client as a Bearer token) |
| `PORT` | Server port — Render sets this automatically; defaults to `3000` locally |

`.env.local` is gitignored, so your real values never get committed.

## 1. Neon (one-time, ~2 min)
1. Create a free project at <https://neon.tech>.
2. **Connect → Connection string** → copy it.
   (The `ledgers` and `transactions` tables are created automatically the first time the
   server starts — no manual SQL needed.)

## 2. Run locally
1. `copy .env.example .env.local` and fill in `DATABASE_URL` + `APP_PASSWORD`.
2. `npm install`
3. Run the API and the app (two terminals):
   ```bash
   npm run dev:server   # API on http://localhost:3000
   npm run dev          # app on http://localhost:5173 (proxies /api → :3000)
   ```
   Open <http://localhost:5173> and enter your password.

   > Or to run exactly like production on a single port: `npm run build` then `npm start`,
   > and open <http://localhost:3000>.

## 3. Deploy to Render (free)
### Option A — Blueprint (uses `render.yaml`)
1. Push this repo to GitHub.
2. <https://dashboard.render.com> → **New → Blueprint** → connect the repo.
3. When prompted, paste `DATABASE_URL` and `APP_PASSWORD` → **Apply**.

### Option B — manual
1. **New → Web Service** → connect the repo.
2. **Build Command:** `npm install && npm run build` — **Start Command:** `npm start`
3. **Environment:** add `DATABASE_URL` and `APP_PASSWORD`.
4. **Health Check Path:** `/healthz` → **Create Web Service**.

## 4. Keep the free service awake (cron)
Free Render web services sleep after ~15 min idle and take ~50s to cold-start on the next
request. Ping `/healthz` every ~14 minutes to keep it warm:

- <https://cron-job.org> (free) → **Create cronjob** → URL
  `https://YOUR-APP.onrender.com/healthz`, schedule **every 14 minutes**.

Keeping one free service awake 24/7 stays within Render's 750 free instance-hours/month.

## Backup
Use the **Backup** page to export the full dataset as JSON, or import a JSON backup
(replaces all data). Same format throughout, so old `hisab-backup-*.json` files still import.
