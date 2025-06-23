const billboard = require('billboard-top-100');
const fs = require('fs');
const path = require('path');

const today = new Date();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');

const yearsAgo = [10, 20, 30, 40, 50];
const baseYear = today.getFullYear();

const results = [];

function fetchChart(yearOffset, callback) {
  const year = baseYear - yearOffset;
  const dateString = `${year}-${month}-${day}`;

  billboard.getChart('hot-100', dateString, (err, chart) => {
    if (err) {
      console.error('Failed to fetch chart for', dateString, err);
      callback(null);
      return;
    }

    const topSong = chart.songs[0];
    results.push({
      date: chart.date,
      title: topSong.title,
      artist: topSong.artist,
      fact: `#1 on Billboard Hot 100 on this day in ${year}.`,
      spotify: `https://open.spotify.com/search/${encodeURIComponent(topSong.title + ' ' + topSong.artist)}`,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(topSong.title + ' ' + topSong.artist)}`
    });
    callback(null);
  });
}

let completed = 0;
yearsAgo.forEach(offset => {
  fetchChart(offset, () => {
    completed++;
    if (completed === yearsAgo.length) {
      const filePath = path.join(__dirname, 'data', 'todaysSongs.json');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
      console.log('🎶 Billboard top songs from past decades saved!');
    }
  });
});