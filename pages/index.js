import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home({ song }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>Top Track Time Machine</title>
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