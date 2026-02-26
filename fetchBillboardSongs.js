let billboard = null;
try {
  billboard = require('billboard-top-100');
} catch (error) {
  // Optional dependency: this script can only fetch fresh chart data when installed.
}
const fs = require('fs');
const path = require('path');


if (!billboard) {
  console.error(
    'Missing optional dependency "billboard-top-100". Install it before running fetch:songs, or use the checked-in data/todaysSongs.json.',
  );
  process.exit(1);
}

const START_YEAR = 1975;
const today = new Date();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const endYear = today.getFullYear();

function getChart(chartDate) {
  return new Promise((resolve, reject) => {
    billboard.getChart('hot-100', chartDate, (error, chart) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(chart);
    });
  });
}

async function fetchCoverArt(title, artist) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = await response.json();
    const artwork = payload?.results?.[0]?.artworkUrl100;
    return artwork ? artwork.replace('100x100bb', '600x600bb') : null;
  } catch (error) {
    return null;
  }
}

async function run() {
  const results = [];

  for (let year = START_YEAR; year <= endYear; year += 1) {
    const dateString = `${year}-${month}-${day}`;

    try {
      const chart = await getChart(dateString);
      const topSong = chart.songs[0];

      const weeksAtNumberOne = Number(
        topSong.weeksAtNumberOne ?? topSong.weeksAtNo1 ?? topSong.weeksAtPeak ?? 0,
      );

      const coverArt = await fetchCoverArt(topSong.title, topSong.artist);

      results.push({
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

      console.log(`Fetched ${year}: ${topSong.title} — ${topSong.artist}`);
    } catch (error) {
      console.error(`Failed to fetch chart for ${dateString}:`, error.message || error);
    }
  }

  const filePath = path.join(__dirname, 'data', 'todaysSongs.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Saved ${results.length} entries to ${filePath}`);
}

run();
