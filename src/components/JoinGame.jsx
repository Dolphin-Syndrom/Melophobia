import React, { useState } from 'react';

export default function JoinGame({ roomCode, storedUsername, onJoin, loading, error }) {
  const [username, setUsername] = useState(storedUsername || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 2 || name.length > 20) return;
    onJoin(name);
  };

  return (
    <div className="melo-container melo-center melo-slide-up" style={{ gap: '24px', paddingTop: '60px' }}>
      <img
        src="/music-syllable.png"
        alt="Music note"
        style={{
          width: '36px',
          height: 'auto',
          objectFit: 'contain',
          imageRendering: 'pixelated',
          mixBlendMode: 'multiply',
          display: 'block',
          margin: '0 auto',
        }}
      />

      <div>
        <h1 className="melo-title" style={{ fontSize: '1.6rem', marginBottom: '6px' }}>MELOPHOBIA</h1>
        <p className="melo-subtitle">You've been invited!</p>
      </div>

      <div className="melo-card" style={{ width: '100%', maxWidth: '340px', padding: '24px' }}>
        <p className="melo-label" style={{ textAlign: 'center' }}>Room</p>
        <p className="melo-room-code" style={{ marginBottom: '20px' }}>{roomCode}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <p className="melo-label">Your name</p>
            <input
              className="melo-input"
              placeholder="Enter your name"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && (
            <p style={{ color: 'var(--melo-error)', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            className="melo-btn melo-btn-primary melo-btn-full"
            disabled={username.trim().length < 2 || loading}
          >
            {loading ? (
              <span className="melo-spinner" style={{ width: 22, height: 22, borderWidth: 2 }}></span>
            ) : (
              'JOIN GAME'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
