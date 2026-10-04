import React, { useEffect, useState } from 'react';
import VinylIcon from './VinylIcon.jsx';

export default function Countdown({ value, onComplete }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    setDisplay(value);
  }, [value]);

  useEffect(() => {
    if (typeof display === 'number') {
      if (display <= 0) {
        onComplete?.();
        return;
      }
      const timer = setTimeout(() => setDisplay(d => (typeof d === 'number' ? d - 1 : d)), 1000);
      return () => clearTimeout(timer);
    }
  }, [display, onComplete]);

  if (typeof display === 'number' && display <= 0) return null;

  const isPreparing = typeof display === 'string';

  return (
    <div className="melo-countdown" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'center', background: 'var(--melo-bg)' }}>
      <div className="melo-container" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
          <h2 className="melo-header-title" style={{ margin: 0 }}>
            {isPreparing ? 'Preparing...' : 'Game Setup'}
          </h2>
        </div>

        {/* Central Graphic */}
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <div style={{ display: 'inline-block', width: '120px', height: '120px', position: 'relative' }}>
            <VinylIcon spinning={true} />
          </div>
        </div>

        {/* Status text */}
        <p className="melo-label" style={{ textAlign: 'center', marginBottom: '24px', textTransform: 'none' }}>
          {isPreparing ? 'Fetching YouTube playlist...' : 'Ready to begin!'}
        </p>

        {/* Checklist */}
        <div className="melo-recessed-box" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <span style={{ color: 'var(--melo-text-bright)' }}>✓</span>
            <span style={{ fontSize: '0.85rem' }}>Connecting to YouTube</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <span style={{ color: 'var(--melo-text-bright)' }}>✓</span>
            <span style={{ fontSize: '0.85rem' }}>Loading playlist</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <span style={{ color: 'var(--melo-text-bright)' }}>{isPreparing ? '⋯' : '✓'}</span>
            <span style={{ fontSize: '0.85rem' }}>Preparing rounds</span>
          </div>
        </div>

        {/* Timer */}
        {!isPreparing && (
          <div style={{ textAlign: 'center', marginTop: 'auto', paddingBottom: '40px' }}>
            <div className="melo-timer-circle" style={{ marginBottom: '16px' }}>
              {display}
            </div>
            <p className="melo-label" style={{ textTransform: 'none' }}>Game will start in {display}</p>
          </div>
        )}
      </div>
    </div>
  );
}
