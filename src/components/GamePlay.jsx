import React, { useEffect, useRef, useState } from 'react';
import { Play, Crown, User } from 'lucide-react';
import useRoundTimer from '../hooks/useRoundTimer.js';
import ReactionBar from './ReactionBar.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

// Pseudo-random waveform heights seeded so they stay consistent per round
function buildBars(count, seed) {
  const heights = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const t = (s >>> 0) / 0xffffffff;
    // Sinusoidal envelope so the middle looks "louder"
    const env = Math.sin((i / count) * Math.PI);
    heights.push(0.12 + env * 0.75 * t + 0.13 * t);
  }
  return heights;
}

const BAR_COUNT = 36;

export default function GamePlay({
  currentRound,
  myAnswer,
  playerAnswerStatuses,
  players,
  onSubmitAnswer,
  room,
  onReaction,
}) {
  const remaining = useRoundTimer(currentRound?.endsAt);
  const totalRounds = room?.settings?.songCount || 10;
  const clipDuration = room?.settings?.clipDuration || 15;

  const answered = !!myAnswer;
  const roundNum = currentRound?.roundNumber || 1;
  const progressPercent = (roundNum / totalRounds) * 100;

  // ── Clip progress (smooth, using requestAnimationFrame) ──────────────────
  const [clipProgress, setClipProgress] = useState(0); // 0–1
  const clipRafRef = useRef(null);

  useEffect(() => {
    const endsAt = currentRound?.endsAt;
    if (!endsAt) {
      setClipProgress(0);
      return;
    }

    const totalMs = clipDuration * 1000;

    const animate = () => {
      const msLeft = Math.max(0, endsAt - Date.now());
      const elapsed = Math.max(0, totalMs - msLeft);
      setClipProgress(Math.min(elapsed / totalMs, 1));
      if (msLeft > 0) {
        clipRafRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => {
      if (clipRafRef.current) cancelAnimationFrame(clipRafRef.current);
    };
  }, [currentRound?.endsAt, clipDuration]);

  // ── Waveform bars ─────────────────────────────────────────────────────────
  const seed = roundNum * 7919;
  const bars = buildBars(BAR_COUNT, seed);

  // Playhead column index (which bar the "head" is at)
  const headIndex = Math.min(Math.floor(clipProgress * BAR_COUNT), BAR_COUNT - 1);

  // Waveform bar animation — bars near the head pulse gently
  const [pulse, setPulse] = useState(0);
  const pulseRafRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      setPulse(((Date.now() - startTimeRef.current) / 1000) % (2 * Math.PI));
      pulseRafRef.current = requestAnimationFrame(tick);
    };
    pulseRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current);
    };
  }, []);

  // Format remaining seconds as M:SS
  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return '0:00';
    const s = Math.max(0, secs);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="melo-container" style={{ gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button className="melo-back-btn" disabled>
          &lt;
        </button>
        <h2 className="melo-header-title" style={{ margin: 0 }}>Round {roundNum} / {totalRounds}</h2>
        <div style={{ width: '40px', position: 'absolute', right: '20px' }}></div>
      </div>

      {/* Round Progress Bar (which round we're on) */}
      <div className="melo-progress-bar">
        <div className="melo-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Live Scores Bar (brought above) */}
      {players && players.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            padding: '2px 2px 4px',
            scrollbarWidth: 'none',
            justifyContent: players.length <= 3 ? 'center' : 'flex-start',
          }}
        >
          {[...players]
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .map((p, idx) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--melo-bg)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  boxShadow: 'var(--neo-out-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                  opacity: p.connected === false ? 0.5 : 1,
                  transition: 'opacity 0.25s ease',
                }}
              >
                {idx === 0 && players.length > 1 ? (
                  <Crown size={12} color="var(--melo-text-bright)" />
                ) : (
                  <User size={12} color="var(--melo-text-dim)" />
                )}
                <span style={{ fontWeight: 600, color: p.connected === false ? 'var(--melo-text-dim)' : 'var(--melo-text)' }}>
                  {p.username} {p.connected === false ? '(left)' : ''}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: 'var(--melo-text-bright)',
                    background: 'rgba(0, 0, 0, 0.06)',
                    padding: '1px 5px',
                    borderRadius: '6px',
                  }}
                >
                  {p.score ?? 0}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Audio Viz */}
      <div className="melo-audio-viz">
        {/* Play indicator */}
        <div className="melo-play-btn">
          <Play size={16} fill="currentColor" color="var(--melo-text-bright)" />
        </div>

        {/* Live Waveform */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {/* Waveform bars */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              height: '36px',
              position: 'relative',
            }}
          >
            {bars.map((h, i) => {
              const played = i < headIndex;
              const isHead = i === headIndex;
              // Bars near head get a subtle living pulse
              const dist = Math.abs(i - headIndex);
              const liveBoost = isHead
                ? 0.15 * Math.sin(pulse * 6) // fast pulse at head
                : dist <= 3
                  ? 0.06 * Math.sin(pulse * 4 + dist) * (1 - dist / 4)
                  : 0;

              const finalH = Math.min(1, h + liveBoost);

              return (
                <div
                  key={i}
                  style={{
                    flex: '0 0 auto',
                    width: '3px',
                    height: `${Math.max(12, finalH * 36)}px`,
                    background: played
                      ? 'var(--melo-text-bright)'
                      : isHead
                        ? 'var(--melo-text-bright)'
                        : 'rgba(0,0,0,0.18)',
                    borderRadius: '2px',
                    transition: 'height 0.08s ease',
                    opacity: played ? 1 : isHead ? 0.9 : 0.45,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Countdown */}
        <div
          style={{
            fontSize: '0.85rem',
            fontFamily: 'var(--melo-font)',
            fontWeight: 700,
            color: remaining !== null && remaining <= 5
              ? 'var(--melo-text-bright)'
              : 'var(--melo-text-dim)',
            minWidth: '40px',
            textAlign: 'right',
          }}
        >
          {formatTime(remaining)}
        </div>
      </div>

      <p className="melo-label" style={{ textAlign: 'center', margin: '4px 0 10px', textTransform: 'none' }}>
        Choose the correct song
      </p>

      {/* Answer grid */}
      <div className="melo-answer-grid">
        {(currentRound?.options || []).map((option, i) => {
          let className = 'melo-answer-btn';
          if (myAnswer === option.id) className += ' selected';

          return (
            <button
              key={option.id}
              className={className}
              onClick={() => onSubmitAnswer(option.id)}
              disabled={answered}
            >
              <div className="melo-answer-letter">{LETTERS[i]}</div>
              <div className="melo-answer-text">
                {option.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Reactions */}
      <div className="melo-reactions-container" style={{ marginTop: '4px', flexDirection: 'column', alignItems: 'stretch' }}>
        <p className="melo-label" style={{ textAlign: 'left', textTransform: 'none', marginBottom: '6px', fontSize: '0.8rem' }}>Spam reactions</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ReactionBar onReaction={onReaction} />
          <span style={{ color: 'var(--melo-text-dim)', fontSize: '1.2rem' }}>+</span>
        </div>
      </div>
    </div>
  );
}
