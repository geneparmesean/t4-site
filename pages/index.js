import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home({ songs }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Top Track Time Machine</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <header className={styles.header}>
        <h1 className={styles.logo}>Top Track Time Machine</h1>
      </header>

      <main className={styles.main}>
        {songs.map((song, index) => (
          <div key={index} className={styles.songCard}>
            <h2 className={styles.title}>🎶 {song.title} – {song.artist}</h2>
            <p className={styles.date}>📅 {song.date}</p>
            <p className={styles.fact}>💡 {song.fact}</p>

            <div className={styles.media}>
              {song.spotifyEmbed && (
                <iframe
                  src={song.spotifyEmbed}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                ></iframe>
              )}
              {song.youtubeEmbed && (
                <iframe
                  width="100%"
                  height="200"
                  src={song.youtubeEmbed}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              )}
            </div>
          </div>
        ))}
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
