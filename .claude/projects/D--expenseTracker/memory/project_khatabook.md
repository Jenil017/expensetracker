---
name: project-khatabook-rewrite
description: Khatabook app — complete rewrite from Hisab to multi-user khatabook with Google OAuth
metadata:
  type: project
---

Complete rewrite of Hisab expense tracker into a multi-user Khatabook app.

**Stack:** React + Vite + Tailwind (frontend) + Express + Neon Postgres (backend) + JWT auth + Google OAuth

**Key design decisions:**
- Multi-user with JWT auth (stored in localStorage as `khatabook_token`)
- Google OAuth via GIS library (frontend popup, verifies id_token on backend)
- Color palette: #2C5EAD / #1591DC / #4BB8FA / #C4E2F5 (blue brand)
- Font: Plus Jakarta Sans + DM Mono
- Mobile-first PWA, bottom nav, modals slide up from bottom

**Schema:** users → persons → person_transactions (type: credit|debit) + expenses

**Credit = "You Will Get"** (they owe you, shown green)
**Debit = "You Will Give"** (you owe them, shown red)

**Google OAuth Client ID:** 398083251519-ckinfrgmi2t331lagdi36gji7nj1eu97.apps.googleusercontent.com
**Render URL:** https://expensetracker-jo9v.onrender.com

**Why:** To replace the old single-user password-based system with proper multi-user auth and proper person-based khatabook tracking.

**How to apply:** When making changes, preserve the blue color palette, mobile-first layout, bottom nav pattern, and credit/debit terminology ("You Will Get" / "You Will Give").
