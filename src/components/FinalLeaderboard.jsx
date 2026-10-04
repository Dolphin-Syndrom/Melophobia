import React from 'react';
import { Trophy, Crown, User, RotateCcw, Home } from 'lucide-react';

export default function FinalLeaderboard({ finalResults, players, isHost, onPlayAgain, onNewGame }) {
  const sorted = [...(finalResults?.standings || players)]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const winner = sorted[0];

  return (
    <div className="melo-container" style={{ gap: '24px' }}>

      {/* Trophy and Header */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Trophy size={56} color="var(--melo-text-bright)" style={{ margin: '0 auto 12px', display: 'block' }} />
        <h2 className="melo-header-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>Game Over</h2>
        <p className="melo-subtitle" style={{ fontSize: '0.85rem' }}>Here are the final scores!</p>
      </div>

      {/* Standings list */}
      <div className="melo-recessed-box" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((player, i) => (
            <div key={player.id} className="melo-player-item" style={{ borderBottom: '1px solid var(--melo-text-dim)', padding: '12px 0' }}>
              <span style={{ fontSize: '1rem', width: '30px', fontWeight: 700, color: 'var(--melo-text-bright)' }}>{i + 1}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {i === 0 ? <Crown size={18} color="var(--melo-text-bright)" /> : <User size={18} color="var(--melo-text-bright)" />}
              </span>
              <span className="melo-player-name" style={{ marginLeft: '12px' }}>{player.username}</span>
              <span className="melo-player-score" style={{ background: 'transparent', boxShadow: 'none' }}>{player.score ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Winner Badge */}
      {winner && (
        <div className="melo-winner-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Trophy size={18} color="var(--melo-text-bright)" />
          <span style={{ fontWeight: 700, color: 'var(--melo-text-bright)' }}>{winner.username} is the winner!</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 'auto', paddingBottom: '24px' }}>
        {isHost && (
          <button
            className="melo-btn"
            onClick={onPlayAgain}
          >
            <RotateCcw size={16} /> Play Again
          </button>
        )}
        <button
          className="melo-btn"
          onClick={onNewGame}
          style={{ boxShadow: 'var(--neo-in-sm)', background: 'transparent' }}
        >
          <Home size={16} /> Home
        </button>
      </div>
    </div>
  );
}
