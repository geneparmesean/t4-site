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

To update `data/todaysSongs.json` with fresh Billboard chart data, run:

```bash
npm install billboard-top-100
npm run fetch:songs
```

If your environment enforces outbound package/network policies, `billboard-top-100`
and external chart requests may be blocked with `403 Forbidden`. In that case, run
the fetch script from an environment with API/network access and commit the updated
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
