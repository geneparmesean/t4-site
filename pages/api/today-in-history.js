const VALID_DATES_URL =
  'https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/valid_dates.json';
const CHART_URL = (date) =>
  `https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/date/${date}.json`;

// simple in-memory cache (survives warm invocations)
let cachedValidDates = null;

function toISODateUTC(year, month1to12, day) {
  const d = new Date(Date.UTC(year, month1to12 - 1, day));
  return d.toISOString().slice(0, 10);
}

function nearestValidDateForYear(validDates, targetISO, year) {
  // validDates is an array of YYYY-MM-DD strings
  // Filter to a window around target date, then pick closest.
  const target = new Date(`${targetISO}T00:00:00Z`).getTime();

  // Only consider dates within the same year and within +/- 10 days
  const candidates = validDates.filter((iso) => {
    if (!iso.startsWith(`${year}-`)) return false;
    const t = new Date(`${iso}T00:00:00Z`).getTime();
    const diffDays = Math.abs(t - target) / (1000 * 60 * 60 * 24);
    return diffDays <= 10;
  });

  if (candidates.length === 0) {
    // fallback: choose the closest date in that year (rare edge cases)
    const sameYear = validDates.filter((iso) => iso.startsWith(`${year}-`));
    sameYear.sort(
      (a, b) =>
        Math.abs(new Date(`${a}T00:00:00Z`).getTime() - target) -
        Math.abs(new Date(`${b}T00:00:00Z`).getTime() - target)
    );
    return sameYear[0];
  }

  candidates.sort(
    (a, b) =>
      Math.abs(new Date(`${a}T00:00:00Z`).getTime() - target) -
      Math.abs(new Date(`${b}T00:00:00Z`).getTime() - target)
  );
  return candidates[0];
}

export default async function handler(_req, res) {
  const now = new Date();
  const month = now.getUTCMonth() + 1; // use UTC for consistency
  const day = now.getUTCDate();
  const currentYear = now.getUTCFullYear();

  if (!cachedValidDates) {
    const vdRes = await fetch(VALID_DATES_URL);
    if (!vdRes.ok) {
      return res.status(502).json({ error: 'Failed to load valid chart dates' });
    }
    cachedValidDates = await vdRes.json();
  }

  const results = [];

  for (let year = 1975; year <= currentYear; year += 1) {
    const targetISO = toISODateUTC(year, month, day);
    const chartDate = nearestValidDateForYear(cachedValidDates, targetISO, year);

    if (!chartDate) continue;

    const chartRes = await fetch(CHART_URL(chartDate));
    if (!chartRes.ok) continue;

    const chart = await chartRes.json();
    const numberOne = chart.data?.find((row) => row.this_week === 1);

    if (numberOne) {
      results.push({
        year,
        targetDate: targetISO,
        chartDate: chart.date,
        song: numberOne.song,
        artist: numberOne.artist,
      });
    }
  }

  return res.status(200).json({
    month,
    day,
    fromYear: 1975,
    toYear: currentYear,
    count: results.length,
    results,
  });
}
