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

To fetch Billboard songs and refresh `data/todaysSongs.json`:

1. Install dependencies:

```bash
npm install
```

2. Run the fetch script with one of the providers below.

### Option A (recommended): RapidAPI

```bash
BILLBOARD_PROVIDER=rapidapi BILLBOARD_RAPIDAPI_KEY=your_key_here npm run fetch:songs
```

Optional host override (only if your RapidAPI subscription uses a different host):

```bash
BILLBOARD_PROVIDER=rapidapi BILLBOARD_RAPIDAPI_HOST=billboard-api2.p.rapidapi.com BILLBOARD_RAPIDAPI_KEY=your_key_here npm run fetch:songs
```

### Option B: `billboard-top-100` package

```bash
npm install billboard-top-100
BILLBOARD_PROVIDER=billboard-top-100 npm run fetch:songs
```

### Option C: Last.fm (geo top tracks)

```bash
BILLBOARD_PROVIDER=lastfm LASTFM_API_KEY=your_key_here npm run fetch:songs
```

Optional country override:

```bash
BILLBOARD_PROVIDER=lastfm LASTFM_API_KEY=your_key_here LASTFM_COUNTRY="United States" npm run fetch:songs
```

Note: Last.fm uses current geo top tracks and does not provide historical chart-by-date parity with Billboard Hot 100.

When the script finishes, it writes results to `data/todaysSongs.json`. If some years fail to fetch, the script now keeps existing values for those years (or uses a `Data unavailable` placeholder) instead of aborting the entire write.

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
