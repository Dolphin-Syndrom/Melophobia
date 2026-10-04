import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENRES, SONG_COUNTS, CLIP_DURATIONS, DEFAULT_SETTINGS } from '../constants.js';

export default function CreateGame({ onCreateRoom }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, artists: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleGenre = (genreId) => {
    setSettings(prev => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter(g => g !== genreId)
        : [...prev.genres, genreId],
    }));
  };

  const handleCreate = async () => {
    if (settings.genres.length === 0) {
      setError('Select at least one genre to continue');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await onCreateRoom({ ...settings, artists: [] });
    setLoading(false);
    if (result?.code) {
      navigate(`/room/${result.code}`);
    }
  };

  return (
    <div className="melo-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
        <button className="melo-back-btn" onClick={() => navigate('/')}>
          &lt;
        </button>
        <h2 className="melo-header-title" style={{ margin: 0 }}>Create Game</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px' }}>
        {/* Genres */}
        <div style={{ marginBottom: '24px' }}>
          <p className="melo-label">Select Genres</p>
          <div className="melo-chip-grid">
            {GENRES.map(genre => (
              <button
                key={genre.id}
                className={`melo-chip ${settings.genres.includes(genre.id) ? 'active' : ''}`}
                onClick={() => toggleGenre(genre.id)}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>

        {/* Song count */}
        <div style={{ marginBottom: '24px' }}>
          <p className="melo-label">Number of Rounds</p>
          <div className="melo-segments">
            {SONG_COUNTS.map(count => (
              <button
                key={count}
                className={`melo-segment ${settings.songCount === count ? 'active' : ''}`}
                onClick={() => setSettings(prev => ({ ...prev, songCount: count }))}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Clip duration */}
        <div style={{ marginBottom: '24px' }}>
          <p className="melo-label">Clip Duration</p>
          <div className="melo-segments">
            {CLIP_DURATIONS.map(d => (
              <button
                key={d.value}
                className={`melo-segment ${settings.clipDuration === d.value ? 'active' : ''}`}
                onClick={() => setSettings(prev => ({ ...prev, clipDuration: d.value }))}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--melo-error)', fontSize: '0.85rem', textAlign: 'center', marginTop: '12px' }}>{error}</p>
        )}
      </div>

      {/* Create */}
      <button
        className="melo-btn"
        onClick={handleCreate}
        disabled={loading}
        style={{ marginTop: 'auto' }}
      >
        {loading ? 'Creating...' : 'Create Room →'}
      </button>
    </div>
  );
}
