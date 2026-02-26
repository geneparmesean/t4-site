# Top Track Time Machine (T4)

A retro-themed app that highlights #1 Billboard hits from history.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production build

```bash
npm run build
npm run start
```

## Refreshing chart data

To update `data/todaysSongs.json` with fresh Billboard chart data, use either provider:

### Option A (recommended): RapidAPI (no npm package required)

```bash
BILLBOARD_RAPIDAPI_KEY=your_key_here npm run fetch:songs
```

Optional overrides:

```bash
BILLBOARD_PROVIDER=rapidapi BILLBOARD_RAPIDAPI_HOST=billboard-api2.p.rapidapi.com BILLBOARD_RAPIDAPI_KEY=your_key_here npm run fetch:songs
```

### Option B: legacy `billboard-top-100` package

```bash
npm install billboard-top-100
BILLBOARD_PROVIDER=billboard-top-100 npm run fetch:songs
```

If your environment enforces outbound package/network policies, run the fetch script
from an environment with API/network access and commit the updated
`data/todaysSongs.json` back to this repository.

## Deploy (Vercel)

This repository is configured for Next.js on Vercel (`vercel.json`).

1. Push this branch to GitHub.
2. Import the repository in Vercel.
3. Keep framework preset as **Next.js**.
4. Deploy.

If you use the Vercel CLI:

```bash
npm i -g vercel
vercel
vercel --prod
```
