const billboard = require('billboard-top-100');
const fs = require('fs');
const path = require('path');

const today = new Date();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const year = Math.floor(Math.random() * (2022 - 1960 + 1)) + 1960;

const dateString = `${year}-${month}-${day}`;

billboard.getChart('hot-100', dateString, (err, chart) => {
  if (err) {
    console.error(err);
    return;
  }

  const topSong = chart.songs[0];

  const songData = {
    date: `${chart.date}`,
    title: topSong.title,
    artist: topSong.artist,
    fact: `#1 on Billboard Hot 100 on this day in ${year}.`,
    spotify: `https://open.spotify.com/search/${encodeURIComponent(topSong.title + ' ' + topSong.artist)}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(topSong.title + ' ' + topSong.artist)}`
  };

  const filePath = path.join(__dirname, 'data', 'todaysSong.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(songData, null, 2), 'utf8');
  console.log('🎶 Billboard song saved:', topSong.title);
});