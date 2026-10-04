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
    <div className="gts-container" style={{ gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
        <button className="gts-back-btn" disabled>
          &lt;
        </button>
        <h2 className="gts-header-title" style={{ margin: 0 }}>
          {isFinalRound ? 'Final Round Result' : 'Round Result'}
        </h2>
      </div>

      {/* Answer Card */}
      <div className="gts-recessed-box" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', marginBottom: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--gts-bg)', boxShadow: 'var(--neo-out)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Music size={20} color="var(--gts-text-bright)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--gts-text-bright)', fontSize: '1rem', marginBottom: '2px' }}>
            {correctAnswer?.title || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gts-text-dim)' }}>
            {correctAnswer?.artist || ''}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="gts-recessed-box" style={{ padding: '12px 16px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((result) => {
            const player = players.find(p => p.id === result.playerId);
            const isCorrect = result.points > 0;
            const scorePercent = isCorrect ? Math.min(100, Math.max(12, Math.round((result.points / 1000) * 100))) : 0;
            return (
              <div key={result.playerId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <User size={16} color="var(--gts-text-bright)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', color: isCorrect ? 'var(--gts-text-bright)' : 'var(--gts-text-dim)', fontWeight: isCorrect ? 700 : 400, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {result.username || player?.username || 'Player'}
                      {isCorrect && result.timeTaken != null && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--gts-text-dim)', background: 'var(--gts-bg)', padding: '1px 6px', borderRadius: '6px', boxShadow: 'var(--neo-in-sm)' }}>
                          ⚡ {result.timeTaken}s
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: isCorrect ? 'var(--gts-text-bright)' : 'var(--gts-text-dim)', fontWeight: 700 }}>
                      {isCorrect ? '✓' : '✕'} {isCorrect ? `+${result.points}` : '0'}
                    </span>
                  </div>
                  {/* Progress bar line scaled to time-decay score */}
                  <div style={{ height: '5px', background: 'var(--gts-bg)', borderRadius: '3px', boxShadow: 'var(--neo-in-sm)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: isCorrect ? 'var(--gts-text-bright)' : 'transparent', borderRadius: '3px', width: `${scorePercent}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Countdown */}
      <div style={{ textAlign: 'center', marginTop: '4px', paddingBottom: '16px' }}>
        <p style={{ color: 'var(--gts-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
          {isFinalRound ? 'Results in...' : 'Next round in...'}
        </p>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gts-bg)', boxShadow: 'var(--neo-out)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontFamily: 'var(--gts-font)', color: 'var(--gts-text-bright)', margin: '0 auto' }}>
          {timeLeft !== null && timeLeft > 0 ? timeLeft : (isFinalRound ? '...' : '')}
        </div>
      </div>
    </div>
  );
}
