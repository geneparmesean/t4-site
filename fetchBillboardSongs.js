const fs = require('fs');
const path = require('path');
const dns = require('dns');

const START_YEAR = 1975;
const today = new Date();
const month = String(today.getUTCMonth() + 1).padStart(2, '0');
const day = String(today.getUTCDate()).padStart(2, '0');
const endYear = today.getUTCFullYear();
const NETWORK_RETRIES = 3;

const VALID_DATES_URL =
  'https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/valid_dates.json';
const CHART_URL = (date) =>
  `https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/date/${date}.json`;

dns.setDefaultResultOrder('ipv4first');

async function fetchWithRetry(url, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= NETWORK_RETRIES; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      const retryable =
        error?.code === 'ENETUNREACH' ||
        error?.code === 'ETIMEDOUT' ||
        error?.cause?.code === 'ENETUNREACH' ||
        error?.cause?.code === 'ETIMEDOUT';

      if (!retryable || attempt === NETWORK_RETRIES) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw lastError;
}

function toISODateUTC(year, month1to12, dayOfMonth) {
  const d = new Date(Date.UTC(year, month1to12 - 1, dayOfMonth));
  return d.toISOString().slice(0, 10);
}

function nearestValidDateForYear(validDates, targetISO, year) {
  const target = new Date(`${targetISO}T00:00:00Z`).getTime();
  const sameYearDates = validDates.filter((iso) => iso.startsWith(`${year}-`));
  if (sameYearDates.length === 0) return null;

  sameYearDates.sort(
    (a, b) =>
      Math.abs(new Date(`${a}T00:00:00Z`).getTime() - target) -
      Math.abs(new Date(`${b}T00:00:00Z`).getTime() - target),
  );

  return sameYearDates[0];
}

function getNumberOne(chartPayload) {
  const rows = Array.isArray(chartPayload?.data) ? chartPayload.data : [];
  return rows.find((row) => Number(row?.this_week) === 1) || null;
}

async function fetchCoverArt(title, artist) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=10`;

  try {
    const response = await fetchWithRetry(url);
    if (!response.ok) return null;
    const payload = await response.json();
    const normalizedArtist = artist.trim().toLowerCase();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const bestMatch =
      results.find((result) => result?.artistName?.trim().toLowerCase() === normalizedArtist) ||
      results.find((result) => result?.artistName?.toLowerCase().includes(normalizedArtist)) ||
      results[0];
    const artwork = bestMatch?.artworkUrl100;
    return artwork ? artwork.replace('100x100bb', '600x600bb') : null;
  } catch (error) {
    return null;
  }
}

function createUnavailableEntry(year) {
  return {
    year,
    title: 'Data unavailable',
    artist: 'Billboard Hot 100',
    fact: `#1 on Billboard Hot 100 data for this day in ${year} is unavailable in this build.`,
    spotify: null,
    youtube: null,
    daysAtNumberOne: null,
    weeksAtNumberOne: null,
    coverArt: null,
  };
}

function loadExistingSongsByYear(filePath) {
  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return new Map(existing.map((song) => [song.year, song]));
  } catch (error) {
    return new Map();
  }
}

async function loadValidDates() {
  const response = await fetchWithRetry(VALID_DATES_URL);
  if (!response.ok) {
    throw new Error(`Failed to load valid_dates.json (${response.status})`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('valid_dates.json payload is not an array');
  }

  return payload;
}

async function loadChartByDate(chartDate) {
  const response = await fetchWithRetry(CHART_URL(chartDate));
  if (!response.ok) {
    throw new Error(`Failed to load chart for ${chartDate} (${response.status})`);
  }

  return response.json();
}

async function run() {
  const filePath = path.join(__dirname, 'data', 'todaysSongs.json');
  const existingSongsByYear = loadExistingSongsByYear(filePath);

  const validDates = await loadValidDates();
  const resultsByYear = new Map();
  const failures = [];

  for (let year = START_YEAR; year <= endYear; year += 1) {
    const targetISO = toISODateUTC(year, Number(month), Number(day));
    const chartDate = nearestValidDateForYear(validDates, targetISO, year);

    if (!chartDate) {
      failures.push({ year, error: `No valid chart date found for ${year}` });
      continue;
    }

    try {
      const chart = await loadChartByDate(chartDate);
      const numberOne = getNumberOne(chart);

      if (!numberOne?.song || !numberOne?.artist) {
        throw new Error(`Chart payload for ${chartDate} does not include a #1 row`);
      }

      const title = numberOne.song;
      const artist = numberOne.artist;
      const weeksAtNumberOne = Number(numberOne?.weeks_at_one ?? 0);
      const coverArt = await fetchCoverArt(title, artist);

      resultsByYear.set(year, {
        year,
        date: chartDate,
        title,
        artist,
        coverArt,
        weeksAtNumberOne: Number.isFinite(weeksAtNumberOne) ? weeksAtNumberOne : null,
        daysAtNumberOne: Number.isFinite(weeksAtNumberOne) ? weeksAtNumberOne * 7 : null,
        fact: `#1 on Billboard Hot 100 on this day in ${year}.`,
        spotify: `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
      });

      console.log(`Fetched ${year}: ${title} — ${artist} (${chartDate})`);
    } catch (error) {
      failures.push({ year, error: error.message || String(error) });
      console.error(`Failed to fetch chart for ${year} (${chartDate}):`, error.message || error);
    }
  }

  if (failures.length > 0) {
    console.warn(
      `Chart fetch failed for ${failures.length} years. Keeping existing entries or placeholders for those years.`,
    );

    failures.forEach((failure) => {
      console.warn(`- ${failure.year}: ${failure.error}`);
      if (!resultsByYear.has(failure.year)) {
        const fallback = existingSongsByYear.get(failure.year) || createUnavailableEntry(failure.year);
        resultsByYear.set(failure.year, fallback);
      }
    });
  }

  for (let year = START_YEAR; year <= endYear; year += 1) {
    if (!resultsByYear.has(year)) {
      const fallback = existingSongsByYear.get(year) || createUnavailableEntry(year);
      resultsByYear.set(year, fallback);
    }
  }

  const results = Array.from(resultsByYear.values()).sort((a, b) => a.year - b.year);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');

  const resolvedCount = results.filter((song) => song.title !== 'Data unavailable').length;
  console.log(
    `Saved ${results.length} entries to ${filePath} (${resolvedCount} resolved, ${results.length - resolvedCount} unavailable)`,
  );
}

run().catch((error) => {
  console.error('Fetch failed:', error.message || error);
  process.exit(1);
});
