import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home({ song }) {
  return (
    <div className={styles.container}>
<Head>
  <title>Top Track Time Machine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
  <link
    href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Stardos+Stencil&display=swap"
    rel="stylesheet"
  />
</Head>
      <main className={styles.main}>
        <h1 className={styles.title}>🎶 {song.title} – {song.artist}</h1>
        <p className={styles.date}>📅 {song.date}</p>
        <p className={styles.fact}>💡 {song.fact}</p>
        <div className={styles.links}>
          <a href={song.spotify} target="_blank">Listen on Spotify</a>
          <a href={song.youtube} target="_blank">Watch on YouTube</a>
        </div>
      </main>
    </div>
  );
}

export async function getStaticProps() {
  const song = require('../data/todaysSong.json');
  return {
    props: { song },
  };
}
