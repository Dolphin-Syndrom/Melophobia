import { useState, useCallback, useRef, useEffect } from 'react';
import useGameSocket from './useGameSocket.js';
import { GAME_STATUS, API_URL } from '../constants.js';

const STORAGE_KEY_PLAYER = 'melo_player_id';
const STORAGE_KEY_USERNAME = 'melo_username';

function getStoredPlayerId() {
  try { return localStorage.getItem(STORAGE_KEY_PLAYER); } catch { return null; }
}
function setStoredPlayerId(id) {
  try { localStorage.setItem(STORAGE_KEY_PLAYER, id); } catch { /* noop */ }
}
function getStoredUsername() {
  try { return localStorage.getItem(STORAGE_KEY_USERNAME) || ''; } catch { return ''; }
}
function setStoredUsername(name) {
  try { localStorage.setItem(STORAGE_KEY_USERNAME, name); } catch { /* noop */ }
}

export default function useGameRoom() {
  // Room state (from server)
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [roundResults, setRoundResults] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(getStoredPlayerId());
  const [countdown, setCountdown] = useState(null);

  // UI state
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [joined, setJoined] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [playerAnswerStatuses, setPlayerAnswerStatuses] = useState({});
  const [myAnswer, setMyAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const reactionIdRef = useRef(0);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, duration = 2500) => {
    clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'room_state': {
        setRoom(data.room);
        setPlayers(data.players || []);
        setStatus(data.room?.status);
        setJoined(true);
        setLoading(false);
        if (data.player_id) {
          setMyPlayerId(data.player_id);
          setStoredPlayerId(data.player_id);
        }
        if (data.current_round) {
          setCurrentRound(data.current_round);
        }
        if (data.already_answered) {
          setMyAnswer('already');
        }
        setError(null);
        break;
      }
      case 'player_joined': {
        if (data.players) {
          setPlayers(data.players);
        } else if (data.player) {
          setPlayers(prev => {
            const exists = prev.find(p => p.id === data.player.id);
            if (exists) return prev.map(p => p.id === data.player.id ? { ...p, ...data.player, connected: true } : p);
            return [...prev, { ...data.player, connected: true }];
          });
        }
        const name = data.player?.username || data.username || 'A player';
        showToast(`${name} joined`);
        break;
      }
      case 'player_left': {
        if (data.players) {
          setPlayers(data.players);
        } else {
          setPlayers(prev => prev.filter(p => p.id !== data.player_id));
        }
        const name = data.username || 'A player';
        showToast(`${name} left`);
        break;
      }
      case 'player_disconnected': {
        if (data.players) {
          setPlayers(data.players);
        } else {
          setPlayers(prev => prev.map(p =>
            p.id === data.player_id ? { ...p, connected: false } : p
          ));
        }
        const name = data.username || 'A player';
        showToast(`${name} disconnected`);
        break;
      }
      case 'player_reconnected': {
        if (data.players) {
          setPlayers(data.players);
        } else if (data.player) {
          setPlayers(prev => {
            const exists = prev.find(p => p.id === (data.player.id || data.player_id));
            if (exists) return prev.map(p => p.id === (data.player.id || data.player_id) ? { ...p, ...data.player, connected: true } : p);
            return [...prev, { ...data.player, connected: true }];
          });
        } else {
          setPlayers(prev => prev.map(p =>
            p.id === data.player_id ? { ...p, connected: true } : p
          ));
        }
        const name = data.username || data.player?.username || 'A player';
        showToast(`${name} rejoined`);
        break;
      }
      case 'game_starting': {
        setStatus(GAME_STATUS.STARTING);
        setCountdown(data.countdown ?? 3);
        setFinalResults(null);
        setRoundResults(null);
        setMyAnswer(null);
        break;
      }
      case 'countdown_tick': {
        setCountdown(data.value);
        break;
      }
      case 'round_started': {
        setStatus(GAME_STATUS.PLAYING);
        setCurrentRound(data.payload);
        setRoundResults(null);
        setMyAnswer(null);
        setPlayerAnswerStatuses({});
        setCountdown(null);
        break;
      }
      case 'player_answered': {
        setPlayerAnswerStatuses(prev => ({
          ...prev,
          [data.player_id]: true,
        }));
        break;
      }
      case 'round_ended': {
        setStatus(GAME_STATUS.REVEALING);
        setRoundResults(data.payload);
        if (data.payload?.players) {
          setPlayers(data.payload.players);
        }
        setCurrentRound(prev => prev ? { ...prev, ended: true } : prev);
        break;
      }
      case 'score_updated': {
        setPlayers(prev => prev.map(p => {
          const updated = data.scores?.[p.id];
          if (updated !== undefined) return { ...p, score: updated };
          return p;
        }));
        break;
      }
      case 'game_finished': {
        setStatus(GAME_STATUS.FINISHED);
        setFinalResults(data.payload);
        setCurrentRound(null);
        setRoundResults(null);
        break;
      }
      case 'host_changed': {
        setRoom(prev => prev ? { ...prev, hostPlayerId: data.new_host_id } : prev);
        showToast(`${data.new_host_name || 'Someone'} is the new host`);
        break;
      }
      case 'reaction_received': {
        const id = ++reactionIdRef.current;
        const reaction = { id, emoji: data.emoji, playerId: data.player_id };
        setReactions(prev => [...prev, reaction]);
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== id));
        }, 1600);
        break;
      }
      case 'error': {
        setError(data.message);
        setLoading(false);
        break;
      }
      case 'room_reset': {
        setStatus(GAME_STATUS.LOBBY);
        setCurrentRound(null);
        setRoundResults(null);
        setFinalResults(null);
        setMyAnswer(null);
        setPlayerAnswerStatuses({});
        setPlayers(data.players || []);
        showToast('Game reset — ready for a new round!');
        break;
      }
      default:
        break;
    }
  }, [showToast]);

  const socket = useGameSocket({
    onMessage: handleMessage,
    onOpen: () => setError(null),
    onClose: () => { },
  });

  const createRoom = useCallback(async (settings) => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = API_URL;
      const body = {
        genres: settings.genres,
        artists: settings.artists,
        song_count: settings.songCount,
        clip_duration: settings.clipDuration,
      };
      const res = await fetch(`${apiBase}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create room');
      }
      const data = await res.json();
      setLoading(false);
      return data;
    } catch (e) {
      setError(e.message);
      setLoading(false);
      return null;
    }
  }, []);

  const joinRoom = useCallback((roomCode, username) => {
    setLoading(true);
    setError(null);
    setStoredUsername(username);
    const playerId = getStoredPlayerId();

    // Use onConnected callback — fires immediately when WebSocket opens
    socket.connect(roomCode, playerId, () => {
      socket.send('join_room', { username, player_id: playerId });
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!socket.connected) {
        setError('Could not connect to game server');
        setLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [socket]);

  const startGame = useCallback(() => {
    socket.send('start_game');
  }, [socket]);

  const submitAnswer = useCallback((answerId) => {
    if (myAnswer) return;
    setMyAnswer(answerId);
    socket.send('submit_answer', {
      round_id: currentRound?.roundId,
      answer_id: answerId,
    });
  }, [socket, currentRound, myAnswer]);

  const sendReaction = useCallback((emoji) => {
    socket.send('send_reaction', { emoji });
  }, [socket]);

  const playAgain = useCallback(() => {
    socket.send('play_again');
  }, [socket]);

  const leaveRoom = useCallback(() => {
    socket.send('leave_room');
    socket.disconnect();
    setRoom(null);
    setPlayers([]);
    setStatus(null);
    setJoined(false);
    setCurrentRound(null);
    setRoundResults(null);
    setFinalResults(null);
    setMyAnswer(null);
  }, [socket]);

  const isHost = room?.hostPlayerId === myPlayerId;
  const storedUsername = getStoredUsername();

  return {
    // Server state
    room,
    players,
    status,
    currentRound,
    roundResults,
    finalResults,
    myPlayerId,
    isHost,
    countdown,

    // UI state
    error,
    toast,
    joined,
    reactions,
    playerAnswerStatuses,
    myAnswer,
    loading,
    storedUsername,
    connected: socket.connected,

    // Actions
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    sendReaction,
    playAgain,
    leaveRoom,
    showToast,
    setError,
  };
}
