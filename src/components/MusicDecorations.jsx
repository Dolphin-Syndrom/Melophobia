import React from 'react';

/**
 * MusicDecorations places music-syllable.png notes (at the same small size)
 * and retro pixel accents across the UI, matching the Figma design.
 */
export default function MusicDecorations() {
  const notes = [
    { top: '22%', right: '12%', transform: 'rotate(6deg)' },
    { bottom: '25%', left: '9%', transform: 'rotate(-5deg)' },
  ];

  const plusSigns = [
    { top: '34%', left: '7%' },
    { bottom: '20%', right: '8%' },
  ];

  const dots = [
    { top: '45%', right: '6%' },
    { bottom: '35%', left: '6%' },
  ];

  return (
    <div
      className="melo-decorations-layer"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* 3x3 Dot Grid - Top Left */}
      <div className="melo-matrix-grid" style={{ position: 'absolute', top: 24, left: 24 }}>
        {[...Array(9)].map((_, i) => (
          <span key={i} className="melo-matrix-dot" />
        ))}
      </div>

      {/* 3x3 Dot Grid - Bottom Right */}
      <div className="melo-matrix-grid" style={{ position: 'absolute', bottom: 24, right: 24 }}>
        {[...Array(9)].map((_, i) => (
          <span key={i} className="melo-matrix-dot" />
        ))}
      </div>

      {/* Music Syllable Notes - all with same small size */}
      {notes.map((style, idx) => (
        <img
          key={`note-${idx}`}
          src="/music-syllable.png"
          alt=""
          className="melo-pixel-note"
          style={{
            position: 'absolute',
            width: '28px',
            height: 'auto',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            mixBlendMode: 'multiply',
            opacity: 0.95,
            ...style,
          }}
        />
      ))}

      {/* Pixel Plus Signs */}
      {plusSigns.map((pos, idx) => (
        <span
          key={`plus-${idx}`}
          className="melo-pixel-plus"
          style={{
            position: 'absolute',
            ...pos,
          }}
        >
          +
        </span>
      ))}

      {/* Pixel Dots */}
      {dots.map((pos, idx) => (
        <span
          key={`dot-${idx}`}
          className="melo-pixel-dot"
          style={{
            position: 'absolute',
            ...pos,
          }}
        />
      ))}
    </div>
  );
}
