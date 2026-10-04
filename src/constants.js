export const GENRES = [
  { id: 'english', label: 'English' },
  { id: 'hindi', label: 'Hindi' },
  { id: '90s-hindi', label: "Hindi 90's" },
  { id: 'pop', label: 'Pop' },
  { id: 'rap', label: 'Rap' },
  { id: 'hiphop', label: 'Hip-Hop' },
];

export const SONG_COUNTS = [5, 10, 15, 20];

export const CLIP_DURATIONS = [
  { value: 10, label: '10 sec' },
  { value: 15, label: '15 sec' },
  { value: 20, label: '20 sec' },
  { value: 30, label: '30 sec' },
];

export const DEFAULT_SETTINGS = {
  genres: [],
  artists: [],
  songCount: 10,
  clipDuration: 15,
};

export const SCORING = {
  1: 1000,
  2: 750,
  3: 500,
  default: 250,
  wrong: 0,
};

export const REACTIONS = ['😂', '🔥', '🤯', '💀', '👏'];

// In dev, Vite proxy handles /ws -> ws://localhost:8000/ws
// In production, configure VITE_API_URL to point to the backend (e.g., https://your-backend.onrender.com)
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_URL = import.meta.env.VITE_WS_URL || 
  (API_URL ? `${API_URL.replace(/^http/, 'ws')}/ws` : `${wsProtocol}//${window.location.host}/ws`);

export const ROOM_CODE_LENGTH = 6;

export const GAME_STATUS = {
  LOBBY: 'lobby',
  STARTING: 'starting',
  PLAYING: 'playing',
  REVEALING: 'revealing',
  FINISHED: 'finished',
};
