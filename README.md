# GRE Routine Planner

A Next.js + TypeScript GRE planner designed around a Monday-Friday 8 AM-5 PM job and five daily Salah.

## Features
- Prayer-aware daily routine
- Editable placeholder prayer times
- Monday-Sunday GRE task tracker
- Quant/Verbal/Mixed/Mock task labels
- Weekly study-hour goal
- Progress dashboard
- Cross-device sync via a private sync code (Neon Postgres), with LocalStorage as the offline cache
- Responsive layout
- Vercel-ready

## Run
```bash
yarn install
yarn dev
```

## Deploy to Vercel
Import this project into Vercel, then add a Neon database for sync:
1. In the Vercel dashboard open **Storage → Marketplace → Neon** (free plan) and connect it to the project. This sets `DATABASE_URL`. Or create a project at neon.tech and add its connection string as `DATABASE_URL` yourself.
2. Redeploy. The `plans` table is created automatically on first use.
3. In the app click **Sync → Generate new code**, then enter the same code on your other devices.

Locally, put `DATABASE_URL=...` in `.env.local`. Without a database the app still works, just per device.
