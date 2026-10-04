import React, { useState, useEffect } from 'react';
import { Music, User } from 'lucide-react';

export default function RoundReveal({ roundResults, players, room, currentRound, onReaction }) {
  const [timeLeft, setTimeLeft] = useState(null);

  const isFinalRound = Boolean(
    roundResults?.isFinalRound ||
    (roundResults?.totalRounds && roundResults?.roundNumber >= roundResults?.totalRounds) ||
    (room?.settings?.songCount && currentRound?.roundNumber >= room?.settings?.songCount)
  );

  useEffect(() => {
    const duration = roundResults?.waitDuration || 3000;
    const targetTime = Date.now() + duration;

    setTimeLeft(Math.ceil(duration / 1000));

    const interval = setInterval(() => {
      const remaining = Math.ceil((targetTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [roundResults?.waitDuration]);

  if (!roundResults) return null;

  const { correctAnswer, playerResults } = roundResults;
  const sorted = [...(playerResults || [])].sort((a, b) => b.points - a.points);

  return (
    <div className="melo-container" style={{ gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
        <button className="melo-back-btn" disabled>
          &lt;
        </button>
        <h2 className="melo-header-title" style={{ margin: 0 }}>
          {isFinalRound ? 'Final Round Result' : 'Round Result'}
        </h2>
      </div>

      {/* Answer Card */}
      <div className="melo-recessed-box" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', marginBottom: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--melo-bg)', boxShadow: 'var(--neo-out)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Music size={20} color="var(--melo-text-bright)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--melo-text-bright)', fontSize: '1rem', marginBottom: '2px' }}>
            {correctAnswer?.title || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--melo-text-dim)' }}>
            {correctAnswer?.artist || ''}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="melo-recessed-box" style={{ padding: '12px 16px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((result) => {
            const player = players.find(p => p.id === result.playerId);
            const isCorrect = result.points > 0;
            return (
              <div key={result.playerId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <User size={16} color="var(--melo-text-bright)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.85rem', color: isCorrect ? 'var(--melo-text-bright)' : 'var(--melo-text-dim)', fontWeight: isCorrect ? 700 : 400 }}>
                      {result.username || player?.username || 'Player'}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: isCorrect ? 'var(--melo-text-bright)' : 'var(--melo-text-dim)', fontWeight: 700 }}>
                      {isCorrect ? '✓' : '✕'} {isCorrect ? `+${result.points}` : '0'}
                    </span>
                  </div>
                  {/* Progress bar line */}
                  <div style={{ height: '4px', background: 'var(--melo-bg)', borderRadius: '2px', boxShadow: 'var(--neo-in-sm)' }}>
                    <div style={{ height: '100%', background: isCorrect ? 'var(--melo-text-bright)' : 'transparent', borderRadius: '2px', width: isCorrect ? '100%' : '0%' }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Countdown */}
      <div style={{ textAlign: 'center', marginTop: '4px', paddingBottom: '16px' }}>
        <p style={{ color: 'var(--melo-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
          {isFinalRound ? 'Results in...' : 'Next round in...'}
        </p>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--melo-bg)', boxShadow: 'var(--neo-out)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontFamily: 'var(--melo-font)', color: 'var(--melo-text-bright)', margin: '0 auto' }}>
          {timeLeft !== null && timeLeft > 0 ? timeLeft : (isFinalRound ? '...' : '')}
        </div>
      </div>
    </div>
  );
}
