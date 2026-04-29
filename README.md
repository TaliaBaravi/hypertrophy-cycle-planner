# PulseCycle Hypertrophy Planner

PulseCycle is a mobile-first hypertrophy planning MVP inspired by RP-style mesocycles. It lets a user:

- create a 6-week or 8-week build phase with a deload
- set `High`, `Medium`, and `Maintain` muscle priorities
- assign muscles to each training day
- choose curated or custom exercises
- set week 1 baselines for load, sets, and rep ranges
- log sets with reps, load, and RIR
- generate next-week recommendations and confirm them before applying

## Run locally

```bash
npm run dev
```

Then open [http://localhost:4173](http://localhost:4173).

Local development uses Python's built-in static file server so the app behaves the same way locally and on Vercel.

## Deploy to Vercel

This project is a static site. Vercel should deploy the repository root directly, and [vercel.json](/Users/taliabaravi/Documents/bulking%202026/vercel.json) rewrites `/` to `index.html` so the homepage loads at the root URL.

## Test

```bash
npm test
```

## Notes

- The app uses browser `localStorage`, so the current cycle persists locally.
- Recommendation logic is deliberately rule-based and explainable.
- The MVP is implemented without external dependencies so it can run from a blank workspace.
