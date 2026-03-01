import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import styles from '../styles/Home.module.css';

function getYear(song = {}) {
  if (typeof song.year === 'number') return song.year;
  const match = (song.fact || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export default function Home({ songs }) {
  const [liveSongs, setLiveSongs] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTodayInHistory() {
      try {
        const response = await fetch('/api/today-in-history');
        if (!response.ok) return;

        const payload = await response.json();
        const liveResults = Array.isArray(payload?.results) ? payload.results : [];
        const byYear = new Map(songs.map((song) => [song.year, song]));

        liveResults.forEach((result) => {
          const title = result?.song;
          const artist = result?.artist;
          const year = Number(result?.year);

          if (!title || !artist || !Number.isFinite(year)) return;

          byYear.set(year, {
            year,
            date: result?.chartDate || null,
            title,
            artist,
            coverArt: result?.coverArt || null,
            weeksAtNumberOne: null,
            daysAtNumberOne: null,
            fact: `#1 on Billboard Hot 100 on this day in ${year}.`,
            spotify: `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`,
            youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist}`)}`,
          });
        });

        if (!cancelled) {
          setLiveSongs(Array.from(byYear.values()));
        }
      } catch (error) {
        // Keep static fallback data when runtime fetch is unavailable.
      }
    }

    loadTodayInHistory();

    return () => {
      cancelled = true;
    };
  }, [songs]);

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(today);

  const displayedSongs = useMemo(() => liveSongs || songs, [liveSongs, songs]);
  const sortedSongs = [...displayedSongs].sort((a, b) => (getYear(a) ?? 0) - (getYear(b) ?? 0));
  const missingYears = displayedSongs.filter((song) => song.title === 'Data unavailable').length;

  return (
    <div className={styles.container}>
      <Head>
        <title>Top Track Time Machine</title>
        <meta
          name="description"
          content="Explore Billboard #1 songs for this date, with placeholders where chart data has not been fetched yet."
        />
      </Head>

      <header className={styles.header}>
        <h1 className={styles.logo}>Top Track Time Machine</h1>
        <p className={styles.subtitle}>
          Billboard Hot 100 #1 songs for <strong>{formattedDate}</strong>, every year since 1975.
        </p>
        {missingYears > 0 && (
          <p className={styles.notice}>
            This build currently ships with sample chart data. Years marked “Data unavailable” will fill
            in after running the chart fetch script with API access.
          </p>
        )}
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          {sortedSongs.map((song, index) => {
            const year = getYear(song);

            return (
              <article key={`${song.title}-${song.artist}-${year ?? index}`} className={styles.songCard}>
                {song.coverArt && (
                  <img
                    src={song.coverArt}
                    alt={`Cover art for ${song.title} by ${song.artist}`}
                    className={styles.coverArt}
                    loading="lazy"
                  />
                )}
                <div className={styles.cardHeader}>
                  <p className={styles.badge}>{year ?? 'Unknown Year'}</p>
                </div>
                <h2 className={styles.title}>
                  {song.title}
                  <span className={styles.artist}> — {song.artist}</span>
                </h2>
                <div className={styles.links}>
                  {song.spotify && (
                    <a href={song.spotify} target="_blank" rel="noreferrer">
                      Open in Spotify
                    </a>
                  )}
                  {song.youtube && (
                    <a href={song.youtube} target="_blank" rel="noreferrer">
                      Watch on YouTube
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export async function getStaticProps() {
  const songs = require('../data/todaysSongs.json');

  return {
    props: { songs },
  };
}
