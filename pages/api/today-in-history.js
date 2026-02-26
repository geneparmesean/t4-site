const VALID_DATES_URL =
  "https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/valid_dates.json";
const CHART_URL = (date) =>
  `https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/date/${date}.json`;

let cachedValidDates = null;

function toISODateUTC(year, month1to12, day) {
  const d = new Date(Date.UTC(year, month1to12 - 1, day));
  return d.toISOString().slice(0, 10);
}

function nearestValidDateForYear(validDates, targetISO, year) {
  const target = new Date(targetISO + "T00:00:00Z").getTime();
  const sameYear = validDates.filter((iso) => iso.startsWith(String(year) + "-"));
  sameYear.sort(
    (a, b) =>
      Math.abs(new Date(a + "T00:00:00Z").getTime() - target) -
      Math.abs(new Date(b + "T00:00:00Z").getTime() - target)
  );
  return sameYear[0];
}

export default async function handler(req, res) {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const currentYear = now.getUTCFullYear();

  if (!cachedValidDates) {
    const vdRes = await fetch(VALID_DATES_URL);
    if (!vdRes.ok) return res.status(502).json({ error: "Failed to load valid chart dates" });
    cachedValidDates = await vdRes.json();
  }

  const results = [];
  for (let year = 1975; year <= currentYear; year++) {
    const targetISO = toISODateUTC(year, month, day);
    const chartDate = nearestValidDateForYear(cachedValidDates, targetISO, year);

    const chartRes = await fetch(CHART_URL(chartDate));
    if (!chartRes.ok) continue;

    const chart = await chartRes.json();
    const numberOne = chart?.data?.find((row) => row.this_week === 1);

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

  res.status(200).json({ month, day, results });
}
