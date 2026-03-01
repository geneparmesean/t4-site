const VALID_DATES_URL =
  'https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/valid_dates.json';
const CHART_URL = (date) =>
  `https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/date/${date}.json`;
const ITUNES_URL = (title, artist) => {
  const query = encodeURIComponent(`${title} ${artist}`);
  return `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=10`;
};

let cachedValidDates = null;
const coverArtCache = new Map();

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

function toISODateUTC(year, month1to12, day) {
  const d = new Date(Date.UTC(year, month1to12 - 1, day));
  return d.toISOString().slice(0, 10);
}

function nearestValidDateForYear(validDates, targetISO, year) {
  const target = new Date(`${targetISO}T00:00:00Z`).getTime();
  const sameYear = validDates.filter((iso) => iso.startsWith(`${year}-`));

  if (sameYear.length === 0) return null;

  sameYear.sort(
    (a, b) =>
      Math.abs(new Date(`${a}T00:00:00Z`).getTime() - target) -
      Math.abs(new Date(`${b}T00:00:00Z`).getTime() - target),
  );

  return sameYear[0];
}

async function fetchCoverArt(title, artist) {
  const cacheKey = `${title}|||${artist}`;
  if (coverArtCache.has(cacheKey)) {
    return coverArtCache.get(cacheKey);
  }

  try {
    const payload = await fetchJson(ITUNES_URL(title, artist));
    const normalizedArtist = artist.trim().toLowerCase();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const bestMatch =
      results.find((result) => result?.artistName?.trim().toLowerCase() === normalizedArtist) ||
      results.find((result) => result?.artistName?.toLowerCase().includes(normalizedArtist)) ||
      results[0];
    const artwork = bestMatch?.artworkUrl100;
    const highRes = artwork ? artwork.replace('100x100bb', '600x600bb') : null;
    coverArtCache.set(cacheKey, highRes);
    return highRes;
  } catch (error) {
    coverArtCache.set(cacheKey, null);
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    const currentYear = now.getUTCFullYear();

    if (!cachedValidDates) {
      cachedValidDates = await fetchJson(VALID_DATES_URL);
    }

    const results = [];

    for (let year = 1975; year <= currentYear; year += 1) {
      const targetISO = toISODateUTC(year, month, day);
      const chartDate = nearestValidDateForYear(cachedValidDates, targetISO, year);
      if (!chartDate) continue;

      try {
        const chart = await fetchJson(CHART_URL(chartDate));
        const numberOne = chart?.data?.find((row) => Number(row?.this_week) === 1);
        if (!numberOne?.song || !numberOne?.artist) continue;

        const coverArt = await fetchCoverArt(numberOne.song, numberOne.artist);

        results.push({
          year,
          targetDate: targetISO,
          chartDate: chart.date,
          song: numberOne.song,
          artist: numberOne.artist,
          coverArt,
        });
      } catch (error) {
        // Continue serving other years even if one chart fetch fails.
      }
    }

    res.status(200).json({ month, day, results });
  } catch (error) {
    res.status(502).json({ error: 'Failed to load daily chart history' });
  }
}
