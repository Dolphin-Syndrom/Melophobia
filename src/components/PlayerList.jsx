import React from 'react';
import { Crown, User } from 'lucide-react';

export default function PlayerList({ players, hostPlayerId, showScores = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {players.map((player) => {
        const isOffline = player.connected === false;
        return (
          <div
            key={player.id}
            className="melo-player-item"
            style={{
              opacity: isOffline ? 0.5 : 1,
              transition: 'all 0.25s ease',
            }}
          >
            <div className="melo-player-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {player.id === hostPlayerId ? (
                <Crown size={16} color="var(--melo-text-bright)" />
              ) : (
                <User size={16} color={isOffline ? 'var(--melo-text-dim)' : 'var(--melo-text-bright)'} />
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="melo-player-name" style={{ color: isOffline ? 'var(--melo-text-dim)' : 'var(--melo-text)' }}>
                {player.username}
              </span>
              {isOffline && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.08)',
                    color: 'var(--melo-text-dim)',
                  }}
                >
                  Left
                </span>
              )}
            </div>
            {showScores && (
              <span className="melo-player-score">
                {player.score || 0}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
