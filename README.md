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
React + Vite + Tailwind, with **Firebase**:
- **Firestore** stores the data (free, reliable, syncs across devices).
- **Firebase Auth (Google)** locks the app to a single Google account.

It's a pure static site — no server — so it hosts for free on Vercel with no cold starts.

---

## 1. Create the Firebase project (one-time, ~5 min)
1. Go to <https://console.firebase.google.com> → **Add project** (any name, e.g. `hisab`).
   Google Analytics is optional (you can skip it).
2. **Build → Firestore Database → Create database** → start in **Production mode** →
   pick a location near you → Enable.
3. **Build → Authentication → Get started → Sign-in method → Google → Enable** → set a
   support email → Save.
4. **Project settings (gear icon) → General → Your apps → Web app (`</>`)** → register an
   app (nickname `hisab`, no Hosting needed) → copy the `firebaseConfig` values.

## 2. Configure locally
1. `cp .env.example .env.local` (Windows: `copy .env.example .env.local`).
2. Paste your Firebase values into `.env.local`, and set `VITE_OWNER_EMAIL` to your Google
   email.
3. Make sure the email in **`firestore.rules`** matches `VITE_OWNER_EMAIL`.

```bash
npm install
npm run dev      # http://localhost:5173
```
Sign in with Google — only `VITE_OWNER_EMAIL` is allowed in.

> Bringing over the old local test data? Use **Backup → Import** and select the old
> `server/data/data.json` (or any exported `hisab-backup-*.json`) — same format.

## 3. Publish the Firestore security rules
The rules in `firestore.rules` restrict all reads/writes to your account. Publish them:
- **Easiest:** Firebase Console → **Firestore → Rules**, paste the contents of
  `firestore.rules`, **Publish**.
- **Or via CLI:** `npm i -g firebase-tools && firebase login && firebase deploy --only firestore:rules`
  (needs a `firebase.json` pointing at the rules file).

## 4. Push to GitHub
```bash
git init
git add .
git commit -m "Hisab expense tracker"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
(`.env.local` is gitignored, so your config stays out of the repo.)

## 5. Deploy to Vercel (free)
1. <https://vercel.com> → **Add New → Project** → import your GitHub repo.
2. Framework preset: **Vite** (Build `npm run build`, Output `dist` — auto-detected).
3. **Environment Variables** → add all the `VITE_FIREBASE_*` vars **and**
   `VITE_OWNER_EMAIL` (same values as `.env.local`).
4. **Deploy.**
5. After deploy, copy your Vercel URL (e.g. `your-app.vercel.app`) and add it in
   **Firebase Console → Authentication → Settings → Authorized domains** so Google sign-in
   works on the live site.

Done — open the Vercel URL on your phone or laptop, sign in, and track away. Data lives in
Firestore and is shared across every device you sign in on.

---

## Environment variables
| Var | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | Firebase web config (from console) |
| `VITE_OWNER_EMAIL` | The only Google account allowed to sign in (match `firestore.rules`) |

## Notes on security
Firebase web config values are **not secrets** — they only identify the project. Real
protection comes from `firestore.rules` (owner-only) plus Google sign-in. Keep the email in
`firestore.rules` and `VITE_OWNER_EMAIL` identical.
