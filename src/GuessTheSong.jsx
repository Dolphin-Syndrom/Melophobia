import React, { useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './gts.css';
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

  return (
    <div className="gts-container gts-landing-container">
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
        <h1 className="gts-title">Melophobia</h1>
        <p className="gts-subtitle" style={{ marginBottom: 0, color: '#07090e', fontWeight: 700, fontSize: '0.95rem' }}>
          Listen. Think. Type.
        </p>
      </div>

      {/* Central Vinyl graphic */}
      <div className="gts-square-card" style={{ marginBottom: '24px' }}>
        <div style={{ width: '112px', height: '112px', position: 'relative' }}>
          <VinylIcon />
        </div>
      </div>

      <p className="gts-subtitle" style={{ maxWidth: '320px', margin: '0 auto 28px', lineHeight: 1.6, color: '#07090e', fontWeight: 700, fontSize: '0.95rem' }}>
        You'll hear a short clip of a song.<br />
        Can you guess the title and artist?
      </p>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <button
          className="gts-btn"
          style={{ maxWidth: '260px' }}
          onClick={() => navigate('/melophobia/create')}
        >
          Start Game →
        </button>
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

  // Initialize YT player once API is loaded
  useEffect(() => {
    if (yt.apiLoaded && !yt.ready) {
      yt.initPlayer('gts-yt-player');
    }
  }, [yt.apiLoaded, yt.ready, yt.initPlayer]);

  // Play song when round starts
  useEffect(() => {
    if (game.status === GAME_STATUS.PLAYING && game.currentRound?.song?.youtubeVideoId && yt.ready) {
      const clipDuration = game.room?.settings?.clipDuration || 15;
      const startSeconds = game.currentRound.startSeconds || 0;
      yt.playSong(game.currentRound.song.youtubeVideoId, startSeconds, clipDuration);
    }
    if (game.status === GAME_STATUS.REVEALING) {
      if (game.roundResults?.correctAnswer) {
        yt.revealSong(game.roundResults.correctAnswer);
      }
      yt.stop();
    }
    if (game.status === GAME_STATUS.FINISHED) {
      yt.stop();
    }
  }, [
    game.status,
    game.currentRound?.song?.youtubeVideoId,
    game.currentRound?.startSeconds,
    game.roundResults?.correctAnswer,
    game.room?.settings?.clipDuration,
    yt.ready,
    yt.playSong,
    yt.revealSong,
    yt.stop,
  ]);

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
    navigate('/melophobia');
  }, [game.leaveRoom, navigate]);

  const handleNewGame = useCallback(() => {
    game.leaveRoom();
    navigate('/melophobia/create');
  }, [game.leaveRoom, navigate]);

  return (
    <>
      {/* Hidden YouTube player must always be in the DOM for initialization */}
      <div className="gts-yt-container">
        <div id="gts-yt-player"></div>
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
      {game.toast && <div className="gts-toast">{game.toast}</div>}

      {/* Connection error */}
      {game.error && !game.joined && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--gts-error)',
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

/* ─── Main Wrapper ─── */
export default function GuessTheSong() {
  return (
    <div className="gts-app">
      <NoiseBackground />
      <MusicDecorations />
      <Routes>
        <Route index element={<Landing />} />
        <Route path="create" element={
          <CreateGameWrapper />
        } />
        <Route path=":code" element={<RoomPage />} />
      </Routes>
    </div>
  );
}

/* Wrapper to connect CreateGame to useGameRoom */
function CreateGameWrapper() {
  const game = useGameRoom();

  return (
    <>
      <CreateGame onCreateRoom={game.createRoom} />
      {game.error && (
        <div className="gts-toast" style={{ background: 'var(--gts-error)', color: 'white' }}>
          {game.error}
        </div>
      )}
    </>
  );
}
