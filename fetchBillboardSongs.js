const fs = require('fs');
const path = require('path');
const dns = require('dns');

const START_YEAR = 1975;
const today = new Date();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const endYear = today.getFullYear();
const MAX_DATE_OFFSET_DAYS = 6;
const BILLBOARD_PROVIDER = process.env.BILLBOARD_PROVIDER || 'auto';
const NETWORK_RETRIES = 3;

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

function createTop100Client() {
  let billboard = null;
  try {
    billboard = require('billboard-top-100');
  } catch (error) {
    return null;
  }

  return {
    name: 'billboard-top-100',
    async getChart(chartDate) {
      return new Promise((resolve, reject) => {
        billboard.getChart('hot-100', chartDate, (error, chart) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(chart);
        });
      });
    },
  };
}

function toRapidApiTopSong(payload) {
  const item = payload?.content?.[1] || payload?.content?.['1'] || payload?.data?.[0];

  const title = item?.song || item?.title || item?.name;
  const artist = item?.artist;
  if (!title || !artist) return null;

  return { title, artist };
}

function createRapidApiClient() {
  const key = process.env.BILLBOARD_RAPIDAPI_KEY;
  if (!key) return null;

  const host = process.env.BILLBOARD_RAPIDAPI_HOST || 'billboard-api2.p.rapidapi.com';

  return {
    name: `rapidapi:${host}`,
    async getChart(chartDate) {
      const url = `https://${host}/hot-100?date=${chartDate}&range=1-1`;
      const response = await fetchWithRetry(url, {
        headers: {
          'x-rapidapi-key': key,
          'x-rapidapi-host': host,
        },
      });

      if (!response.ok) {
        throw new Error(`RapidAPI request failed (${response.status})`);
      }

      const payload = await response.json();
      const topSong = toRapidApiTopSong(payload);
      if (!topSong) {
        throw new Error('RapidAPI payload did not include a #1 song');
      }

      return {
        date: chartDate,
        songs: [topSong],
      };
    },
  };
}

function toLastFmTopSong(payload) {
  const track = payload?.tracks?.track?.[0];
  const title = track?.name;
  const artist = track?.artist?.name;

  if (!title || !artist) return null;
  return { title, artist };
}

function createLastFmClient() {
  const key = process.env.LASTFM_API_KEY;
  if (!key) return null;

  const country = process.env.LASTFM_COUNTRY || 'United States';
  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';

  return {
    name: `lastfm:${country}`,
    async getChart(chartDate) {
      const params = new URLSearchParams({
        method: 'geo.gettoptracks',
        country,
        limit: '1',
        api_key: key,
        format: 'json',
      });

      const response = await fetchWithRetry(`${baseUrl}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Last.fm request failed (${response.status})`);
      }

      const payload = await response.json();
      const topSong = toLastFmTopSong(payload);
      if (!topSong) {
        throw new Error('Last.fm payload did not include a top song');
      }

      return {
        date: chartDate,
        songs: [topSong],
      };
    },
  };
}

function getChartClient() {
  const rapidApiClient = createRapidApiClient();
  const top100Client = createTop100Client();
  const lastFmClient = createLastFmClient();

  if (BILLBOARD_PROVIDER === 'rapidapi') {
    if (!rapidApiClient) {
      throw new Error('BILLBOARD_PROVIDER=rapidapi requires BILLBOARD_RAPIDAPI_KEY.');
    }
    return rapidApiClient;
  }

  if (BILLBOARD_PROVIDER === 'billboard-top-100') {
    if (!top100Client) {
      throw new Error(
        'BILLBOARD_PROVIDER=billboard-top-100 requires optional dependency "billboard-top-100" to be installed.',
      );
    }
    return top100Client;
  }

  if (BILLBOARD_PROVIDER === 'lastfm') {
    if (!lastFmClient) {
      throw new Error('BILLBOARD_PROVIDER=lastfm requires LASTFM_API_KEY.');
    }
    return lastFmClient;
  }

  return rapidApiClient || top100Client || lastFmClient;
}

function addDays(isoDate, offset) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + offset);
  return dt.toISOString().slice(0, 10);
}

async function getChartWithFallback(getChart, baseDate) {
  const offsets = [0];
  for (let i = 1; i <= MAX_DATE_OFFSET_DAYS; i += 1) {
    offsets.push(i, -i);
  }

  for (const offset of offsets) {
    const candidate = addDays(baseDate, offset);
    try {
      const chart = await getChart(candidate);
      return {
        chart,
        requestedDate: baseDate,
        resolvedDate: candidate,
        offset,
      };
    } catch (error) {
      // Try next nearby date.
    }
  }

  throw new Error(`No chart found within ±${MAX_DATE_OFFSET_DAYS} days of ${baseDate}`);
}

async function fetchCoverArt(title, artist) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`;

  try {
    const response = await fetchWithRetry(url);
    if (!response.ok) return null;
    const payload = await response.json();
    const artwork = payload?.results?.[0]?.artworkUrl100;
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

async function run() {
  const chartClient = getChartClient();
  if (!chartClient) {
    console.error(
      [
        'No chart provider is available.',
        'Use one of:',
        '- BILLBOARD_RAPIDAPI_KEY=<key> npm run fetch:songs',
        '- npm install billboard-top-100 && npm run fetch:songs',
        '- BILLBOARD_PROVIDER=lastfm LASTFM_API_KEY=<key> npm run fetch:songs',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log(`Using chart provider: ${chartClient.name}`);

  const filePath = path.join(__dirname, 'data', 'todaysSongs.json');
  const existingSongsByYear = loadExistingSongsByYear(filePath);

  const resultsByYear = new Map();
  const failures = [];

  for (let year = START_YEAR; year <= endYear; year += 1) {
    const dateString = `${year}-${month}-${day}`;

    try {
      const { chart, resolvedDate, offset } = await getChartWithFallback(
        chartClient.getChart,
        dateString,
      );
      const topSong = chart.songs[0];

      const weeksAtNumberOne = Number(
        topSong.weeksAtNumberOne ?? topSong.weeksAtNo1 ?? topSong.weeksAtPeak ?? 0,
      );

      const coverArt = await fetchCoverArt(topSong.title, topSong.artist);

      resultsByYear.set(year, {
        year,
        date: chart.date,
        title: topSong.title,
        artist: topSong.artist,
        coverArt,
        weeksAtNumberOne,
        daysAtNumberOne: weeksAtNumberOne > 0 ? weeksAtNumberOne * 7 : null,
        fact: `#1 on Billboard Hot 100 on this day in ${year}.`,
        spotify: `https://open.spotify.com/search/${encodeURIComponent(`${topSong.title} ${topSong.artist}`)}`,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topSong.title} ${topSong.artist}`)}`,
      });

      if (offset === 0) {
        console.log(`Fetched ${year}: ${topSong.title} — ${topSong.artist}`);
      } else {
        console.log(
          `Fetched ${year}: ${topSong.title} — ${topSong.artist} (resolved ${resolvedDate}, offset ${offset > 0 ? '+' : ''}${offset}d)`,
        );
      }
    } catch (error) {
      failures.push({ year, dateString, error: error.message || String(error) });
      console.error(`Failed to fetch chart for ${dateString}:`, error.message || error);
    }
  }

  if (failures.length > 0) {
    console.warn(`Chart fetch failed for ${failures.length} years. Keeping existing entries or placeholders for those years.`);
    failures.forEach((failure) => {
      console.warn(`- ${failure.year} (${failure.dateString}): ${failure.error}`);

      if (!resultsByYear.has(failure.year)) {
        const fallbackEntry = existingSongsByYear.get(failure.year) || createUnavailableEntry(failure.year);
        resultsByYear.set(failure.year, fallbackEntry);
      }
    });
  }

  for (let year = START_YEAR; year <= endYear; year += 1) {
    if (!resultsByYear.has(year)) {
      const fallbackEntry = existingSongsByYear.get(year) || createUnavailableEntry(year);
      resultsByYear.set(year, fallbackEntry);
    }
  }

  const results = Array.from(resultsByYear.values()).sort((a, b) => a.year - b.year);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
  const resolvedCount = results.filter((song) => song.title !== 'Data unavailable').length;
  console.log(`Saved ${results.length} entries to ${filePath} (${resolvedCount} resolved, ${results.length - resolvedCount} unavailable)`);

}

run();
