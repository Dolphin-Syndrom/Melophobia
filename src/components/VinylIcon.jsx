import React from 'react';

/**
 * VinylIcon renders vinyl images:
 * - When spinning: uses /vinyl-clean.png (clean symmetrical record)
 * - When static/landing: uses /vinyl.png (record with play badge)
 */
export default function VinylIcon({ className = '', style = {}, spinning = false }) {
  return (
    <img
      src={spinning ? '/vinyl-clean.png' : '/vinyl.png'}
      alt="Vinyl Record"
      className={`melo-vinyl-img ${spinning ? 'melo-spinning' : ''} ${className}`.trim()}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated',
        mixBlendMode: 'multiply',
        display: 'block',
        userSelect: 'none',
        ...style,
      }}
    />
  );
}
