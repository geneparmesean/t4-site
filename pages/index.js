import Head from 'next/head';
import styles from '../styles/Home.module.css';

function getYearFromFact(fact = '') {
  const match = fact.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export default function Home({ songs }) {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(today);

  const sortedSongs = [...songs].sort((a, b) => {
    const yearA = getYearFromFact(a.fact) ?? 0;
    const yearB = getYearFromFact(b.fact) ?? 0;
    return yearA - yearB;
  });

  return (
    <div className={styles.container}>
      <Head>
        <title>Top Track Time Machine</title>
        <meta
          name="description"
          content="Explore Billboard #1 songs that ruled this date in different years."
        />
      </Head>

      <header className={styles.header}>
        <h1 className={styles.logo}>Top Track Time Machine</h1>
        <p className={styles.subtitle}>
          Billboard Hot 100 #1 songs for <strong>{formattedDate}</strong>, across the decades.
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          {sortedSongs.map((song, index) => {
            const year = getYearFromFact(song.fact);

            return (
              <article key={`${song.title}-${song.artist}-${index}`} className={styles.songCard}>
                <p className={styles.badge}>{year ? year : 'Classic Hit'}</p>
                <h2 className={styles.title}>
                  {song.title}
                  <span className={styles.artist}> — {song.artist}</span>
                </h2>
                <p className={styles.fact}>{song.fact}</p>

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
