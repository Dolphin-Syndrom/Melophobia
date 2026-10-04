import React, { useEffect, useState } from 'react';

/**
 * NoiseBackground recreates the Figma Noise effect across ALL UI elements:
 * - Mode: Mono
 * - Noise size: X: 0.5, Y: 0.5
 * - Density: 100%
 * - Color: #000000 at 30% max opacity
 * - Layer: Fixed top overlay (pointer-events: none, z-index: 9999) so cards, buttons,
 *   labels, and inputs all receive the same texture.
 */
export default function NoiseBackground() {
  const [noiseUrl, setNoiseUrl] = useState('');

  useEffect(() => {
    try {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(size, size);
      const data = imgData.data;

      // 100% density, Mono black (#000000) with random alpha up to 30% (76.5 / 255)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 0;     // R
        data[i + 1] = 0; // G
        data[i + 2] = 0; // B
        data[i + 3] = Math.floor(Math.random() * 77); // up to 30% opacity
      }

      ctx.putImageData(imgData, 0, 0);
      setNoiseUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.warn('Could not generate canvas noise', e);
    }
  }, []);

  return (
    <div
      className="melo-noise-layer"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        backgroundImage: noiseUrl ? `url(${noiseUrl})` : undefined,
        backgroundRepeat: 'repeat',
        backgroundSize: '64px 64px',
      }}
      aria-hidden="true"
    />
  );
}
