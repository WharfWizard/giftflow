# GiftFlow (MVP skeleton)

A local-first Next.js app implementing the core of the GiftFlow spec:
household setup, estate screening triage, the gift register with the shared
reconciliation rule, and the income/expenditure surplus schedule.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first run you'll be asked to start a new
household file or open an existing one. In Chrome or Edge this creates a
real file on your drive via the File System Access API; other browsers
fall back to manual download/reopen (see spec section 8).

## What's implemented

- `lib/types.ts` — the full data model (spec section 4)
- `lib/reconcile.ts` — the shared reconciliation function every evidenced
  record routes through (spec section 3.7)
- `lib/storage.ts` — local-first persistence, autosave, and the
  download/reopen fallback for multi-device use (spec section 8)
- Screens: dashboard, household setup, estate screening triage, gift
  register with live reconciliation, income and expenditure schedule

## What's not yet built

Everything listed under "named but not built" in
GiftFlow_Specification_v2.md section 6 — transaction ledger and import,
document vault, print-to-PDF, reservation of benefit / pre-owned asset /
trust / life assurance entry screens, auth, and the assistant. The
architecture (data model, reconciliation, storage) is built to extend to
all of these without changes to the foundations.

## Deploying to Vercel

```bash
git init
git add .
git commit -m "GiftFlow MVP skeleton"
```

Push to a GitHub repo, then import it in Vercel. No environment variables
or database are needed, since the app has no server-side state — Vercel
will detect Next.js automatically and it just works.
