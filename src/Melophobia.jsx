import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import './melo.css';
import useGameRoom from './hooks/useGameRoom.js';
import useYouTubePlayer from './hooks/useYouTubePlayer.js';
import { GAME_STATUS } from './constants.js';

import CreateGame from './components/CreateGame.jsx';
import JoinGame from './components/JoinGame.jsx';
import Lobby from './components/Lobby.jsx';
import Countdown from './components/Countdown.jsx';
import GamePlay from './components/GamePlay.jsx';
import RoundReveal from './components/RoundReveal.jsx';
import FinalLeaderboard from './components/FinalLeaderboard.jsx';
import FloatingReactions from './components/FloatingReactions.jsx';
import VinylIcon from './components/VinylIcon.jsx';
import NoiseBackground from './components/NoiseBackground.jsx';
import MusicDecorations from './components/MusicDecorations.jsx';

/* ─── Landing Page ─── */
function Landing() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    document.title = 'Melophobia — Real-Time Music Guessing Game';
  }, []);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (clean) {
      navigate(`/room/${clean}`);
    }
  };

  return (
    <div className="melo-container melo-landing-container">
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        {/* Pixel music note above title */}
        <img
          src="/music-syllable.png"
          alt=""
          style={{
            width: '28px',
            height: 'auto',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            mixBlendMode: 'multiply',
            display: 'block',
            margin: '0 auto 16px',
            userSelect: 'none',
          }}
        />
        <h1 className="melo-title">Melophobia</h1>
        <p className="melo-subtitle" style={{ marginBottom: 0, color: '#07090e', fontWeight: 700, fontSize: '0.95rem' }}>
          Listen. Think. Type.
        </p>
      </div>

      {/* Central Vinyl graphic */}
      <div className="melo-square-card" style={{ marginBottom: '24px' }}>
        <div style={{ width: '112px', height: '112px', position: 'relative' }}>
          <VinylIcon />
        </div>
      </div>

      <p className="melo-subtitle" style={{ maxWidth: '320px', margin: '0 auto 28px', lineHeight: 1.6, color: '#07090e', fontWeight: 700, fontSize: '0.95rem' }}>
        You'll hear a short clip of a song.<br />
        Can you guess the title and artist?
      </p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <button
          className="melo-btn"
          style={{ maxWidth: '260px' }}
          onClick={() => navigate('/create')}
        >
          Create Room →
        </button>

        {!showJoin ? (
          <button
            type="button"
            className="melo-btn"
            style={{
              maxWidth: '260px',
              fontSize: '0.9rem',
              background: 'transparent',
              boxShadow: 'none',
              border: '1.5px solid rgba(7, 9, 14, 0.18)',
              color: 'var(--melo-text-dim)',
            }}
            onClick={() => setShowJoin(true)}
          >
            Have a code? Join Room
          </button>
        ) : (
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '260px', width: '100%' }}>
            <input
              className="melo-input"
              style={{ textAlign: 'center', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}
              placeholder="CODE"
              maxLength={8}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="melo-btn melo-btn-primary"
              style={{ padding: '0 18px', width: 'auto' }}
              disabled={!joinCode.trim()}
            >
              Join
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Room Page (orchestrates join → lobby → play → results) ─── */
function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const game = useGameRoom();
  const yt = useYouTubePlayer();

  useEffect(() => {
    document.title = code ? `Room ${code.toUpperCase()} • Melophobia` : 'Melophobia';
  }, [code]);

  // Initialize YT player once API is loaded
  useEffect(() => {
    if (yt.apiLoaded && !yt.ready) {
      yt.initPlayer('melo-yt-player');
    }
  }, [yt.apiLoaded, yt.ready, yt.initPlayer]);

  // Play song when round starts
  useEffect(() => {
    if (game.status === GAME_STATUS.PLAYING && game.currentRound?.song?.youtubeVideoId && yt.ready) {
      const clipDuration = game.room?.settings?.clipDuration || 15;
      const startSeconds = game.currentRound.startSeconds || 0;
      yt.playSong(game.currentRound.song.youtubeVideoId, startSeconds, clipDuration);
    }
    if (game.status === GAME_STATUS.REVEALING || game.status === GAME_STATUS.FINISHED) {
      yt.stop();
    }
  }, [game.status, game.currentRound?.song?.youtubeVideoId, yt.ready]);

  // Cleanup
  useEffect(() => {
    return () => yt.destroy();
  }, []);

  const handleJoin = useCallback((username) => {
    yt.unlockAudio();
    game.joinRoom(code, username);
  }, [game.joinRoom, code, yt]);

  const handleStart = useCallback(() => {
    yt.unlockAudio();
    game.startGame();
  }, [game.startGame, yt]);

  const handleLeave = useCallback(() => {
    game.leaveRoom();
    navigate('/');
  }, [game.leaveRoom, navigate]);

  const handleNewGame = useCallback(() => {
    game.leaveRoom();
    navigate('/create');
  }, [game.leaveRoom, navigate]);

  return (
    <>
      {/* Hidden YouTube player must always be in the DOM for initialization */}
      <div className="melo-yt-container">
        <div id="melo-yt-player"></div>
      </div>

      {/* Not joined yet — show join form */}
      {!game.joined ? (
        <JoinGame
          roomCode={code}
          storedUsername={game.storedUsername}
          onJoin={handleJoin}
          loading={game.loading}
          error={game.error}
        />
      ) : (
        <>
          {/* Floating reactions */}
          <FloatingReactions reactions={game.reactions} />

          {/* Countdown overlay */}
          {game.status === GAME_STATUS.STARTING && game.countdown > 0 && (
            <Countdown value={game.countdown} />
          )}

          {/* State-based screens */}
          {game.status === GAME_STATUS.LOBBY && (
            <Lobby
              room={game.room}
              players={game.players}
              isHost={game.isHost}
              onStart={handleStart}
              onLeave={handleLeave}
              showToast={game.showToast}
            />
          )}

          {game.status === GAME_STATUS.PLAYING && (
            <GamePlay
              currentRound={game.currentRound}
              myAnswer={game.myAnswer}
              playerAnswerStatuses={game.playerAnswerStatuses}
              players={game.players}
              onSubmitAnswer={game.submitAnswer}
              room={game.room}
              onReaction={game.sendReaction}
            />
          )}

          {game.status === GAME_STATUS.REVEALING && (
            <RoundReveal
              roundResults={game.roundResults}
              players={game.players}
              room={game.room}
              currentRound={game.currentRound}
              onReaction={game.sendReaction}
            />
          )}

          {game.status === GAME_STATUS.FINISHED && (
            <FinalLeaderboard
              finalResults={game.finalResults}
              players={game.players}
              isHost={game.isHost}
              onPlayAgain={game.playAgain}
              onNewGame={handleNewGame}
            />
          )}

          {/* Toast */}
          {game.toast && <div className="melo-toast">{game.toast}</div>}

          {/* Connection error */}
          {game.error && !game.joined && (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--melo-error)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              zIndex: 1000,
            }}>
              {game.error}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* Shortcut redirect for direct code in URL (e.g. /ABCD12 -> /room/ABCD12) */
function DirectCodeRedirect() {
  const { code } = useParams();
  if (code && code.toLowerCase() !== 'create') {
    return <Navigate to={`/room/${code.toUpperCase()}`} replace />;
  }
  return <Navigate to="/" replace />;
}

/* ─── Main Wrapper ─── */
export default function Melophobia() {
  return (
    <div className="melo-app">
      <NoiseBackground />
      <MusicDecorations />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create" element={<CreateGameWrapper />} />
        <Route path="/room/:code" element={<RoomPage />} />
        {/* Direct room code entry /:code */}
        <Route path="/:code" element={<DirectCodeRedirect />} />
      </Routes>
    </div>
  );
}

/* Wrapper to connect CreateGame to useGameRoom */
function CreateGameWrapper() {
  const game = useGameRoom();

  useEffect(() => {
    document.title = 'Create Room • Melophobia';
  }, []);

  return (
    <>
      <CreateGame onCreateRoom={game.createRoom} />
      {game.error && (
        <div className="melo-toast" style={{ background: 'var(--melo-error)', color: 'white' }}>
          {game.error}
        </div>
      )}
    </>
  );
}
