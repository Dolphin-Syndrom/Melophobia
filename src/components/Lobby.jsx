import React, { useState, useCallback } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import PlayerList from './PlayerList.jsx';
import ShareRoom from './ShareRoom.jsx';
import { GENRES } from '../constants.js';

export default function Lobby({ room, players, isHost, onStart, onLeave, showToast }) {
  const settings = room?.settings || {};
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(room?.code);
      setCopiedCode(true);
      showToast?.('✓ Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast?.('Could not copy');
    }
  }, [room?.code, showToast]);

  return (
    <div className="melo-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
        <button className="melo-back-btn" onClick={onLeave}>
          &lt;
        </button>
        <h2 className="melo-header-title" style={{ margin: 0 }}>Game Lobby</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Room Code */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p className="melo-label" style={{ margin: 0 }}>Room Code</p>
            {copiedCode && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--melo-text-bright)',
                  background: 'rgba(7, 9, 14, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  animation: 'meloToastPop 0.2s ease-out',
                }}
              >
                <Check size={12} /> Copied!
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--melo-bg)', borderRadius: '18px', border: '1.5px solid rgba(255, 255, 255, 0.65)', padding: '6px', boxShadow: 'var(--neo-in)' }}>
            <span style={{ flex: 1, padding: '10px 16px', fontFamily: 'var(--melo-font)', fontSize: '1.2rem', fontWeight: '700', color: 'var(--melo-text-bright)', letterSpacing: '2px' }}>
              {room?.code}
            </span>
            <button
              className={`melo-copy-btn ${copiedCode ? 'copied' : ''}`}
              onClick={handleCopyCode}
              aria-label="Copy room code"
            >
              {copiedCode ? (
                <Check size={16} color="var(--melo-text-bright)" style={{ animation: 'meloToastPop 0.2s ease-out' }} />
              ) : (
                <Copy size={16} color="var(--melo-text-bright)" />
              )}
            </button>
          </div>
        </div>

        {/* Share */}
        <ShareRoom roomCode={room?.code} showToast={showToast} />

        {/* Players */}
        <div>
          <p className="melo-label">Players ({players.length}/{settings.maxPlayers || 6})</p>
          <div className="melo-recessed-box">
            <PlayerList players={players} hostPlayerId={room?.hostPlayerId} />
            {!isHost && (
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--melo-text-dim)', marginTop: '16px' }}>
                Waiting...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Start Button */}
      {isHost ? (
        <button
          className="melo-btn"
          onClick={onStart}
          disabled={players.length < 1}
          style={{ marginTop: 'auto' }}
        >
          <Play size={16} /> Start Game
        </button>
      ) : (
        <div style={{ marginTop: 'auto' }} />
      )}
    </div>
  );
}
