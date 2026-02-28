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

This project now uses [`mhollingshead/billboard-hot-100`](https://github.com/mhollingshead/billboard-hot-100) as the source-of-truth table for daily #1 songs.

To refresh `data/todaysSongs.json`:

```bash
npm run fetch:songs
```

The script will:

- load the list of valid weekly chart dates from `valid_dates.json`,
- pick the nearest valid chart date for today's month/day in each year,
- read that chart's JSON from `/date/YYYY-MM-DD.json`,
- extract the #1 row,
- preserve any existing year rows if a fetch fails.

If your environment blocks external API access, run the script in an environment with outbound network access and then commit the updated `data/todaysSongs.json` back to this repository.

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
