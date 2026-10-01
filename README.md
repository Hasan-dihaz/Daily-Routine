# GRE Routine Planner

A Next.js + TypeScript GRE planner designed around a Monday-Friday 8 AM-5 PM job and five daily Salah.

## Features
- Prayer-aware daily routine
- Editable placeholder prayer times
- Monday-Sunday GRE task tracker
- Quant/Verbal/Mixed/Mock task labels
- Weekly study-hour goal
- Progress dashboard
- Cross-device sync (single user, Neon Postgres + Prisma), with LocalStorage as the offline cache
- Responsive layout
- Vercel-ready

## Run
```bash
yarn install
yarn dev
```

## Deploy to Vercel
Import this project into Vercel, then add a Neon database for sync:
1. In the Vercel dashboard open **Storage → Marketplace → Neon** (free plan) and connect it to the project. This sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`, which Prisma needs. If you create the database at neon.tech yourself, add both variables.
2. Redeploy. The build runs `prisma db push`, which creates the `plans` table from `prisma/schema.prisma`.
3. Open the app on any device; changes sync automatically. There is no login, so anyone with the URL can edit the plan (fine for personal use).

Locally, put both variables in `.env`/`.env.local` and run `yarn prisma db push` once. Without a database the app still works, just per device.
