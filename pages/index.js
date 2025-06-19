import React from 'react';

const posts = [
  {
    date: "June 19, 1999",
    title: "If You Had My Love",
    artist: "Jennifer Lopez",
    album: "On the 6",
    genre: "Pop/R&B",
    weeksAtOne: 5,
    trivia: "This was J.Lo's debut single and the first #1 of the 2000s era. Originally written for Michael Jackson!",
    spotify: "https://open.spotify.com/track/0qQfHxu2tF3d3RJjLzL7HH",
    youtube: "https://www.youtube.com/watch?v=lYfkl-HXfuU"
  }
];

export default function Home() {
  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', textAlign: 'center' }}>🎶 Top Track Time Machine (T4)</h1>
      {posts.map((post, i) => (
        <div key={i} style={{ margin: '2rem auto', padding: '1rem', maxWidth: '600px', backgroundColor: '#fffbe6', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <h2>🗓️ {post.date}</h2>
          <h3>🎵 "{post.title}" by {post.artist}</h3>
          <p>💡 {post.trivia}</p>
          <p>🎧 <a href={post.spotify} target="_blank" rel="noopener noreferrer">Listen on Spotify</a></p>
          <p>📺 <a href={post.youtube} target="_blank" rel="noopener noreferrer">Watch on YouTube</a></p>
          <p>🏆 Weeks at #1: {post.weeksAtOne} | Album: {post.album} | Genre: {post.genre}</p>
        </div>
      ))}
    </div>
  );
}
