import React from 'react';

export default function Scoreboard({ players }) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="melo-card" style={{ padding: '14px 16px' }}>
      <p className="melo-label" style={{ marginBottom: '6px' }}>Scores</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {sorted.map((player) => (
          <div key={player.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 4px',
            fontSize: '0.85rem',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--melo-text)' }}>{player.username}</span>
            <span className="melo-player-score">{player.score ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
