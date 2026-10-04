import { useRef, useCallback, useState, useEffect } from 'react';

const hasMediaSession = typeof window !== 'undefined' && 'mediaSession' in navigator;

const STEALTH_METADATA = {
  title: 'Guess The Song 🎵',
  artist: 'Melophobia',
  album: 'Round in Progress...',
  artwork: [
    { src: '/vinyl-clean.png', sizes: '512x512', type: 'image/png' },
    { src: '/music-syllable.png', sizes: '128x128', type: 'image/png' },
  ],
};

/**
 * Hook to manage the YouTube IFrame Player API.
 * Hides the player visually; only used for audio playback.
 * Enforces stealth metadata on browser MediaSession and iframe title
 * so mobile notification bars and lockscreens never leak the song name during rounds.
 */
export default function useYouTubePlayer() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const containerIdRef = useRef('gts-yt-player');
  const stealthIntervalRef = useRef(null);
  const isRevealedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  // Stealth MediaSession applier
  const applyStealthMediaSession = useCallback(() => {
    if (!hasMediaSession || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata(STEALTH_METADATA);
      navigator.mediaSession.playbackState = 'playing';
    } catch (e) {
      // ignore
    }
  }, []);

  // Revealed MediaSession applier (called only when round answers are revealed)
  const revealSong = useCallback((songInfo) => {
    isRevealedRef.current = true;
    if (stealthIntervalRef.current) {
      clearInterval(stealthIntervalRef.current);
      stealthIntervalRef.current = null;
    }
    if (!hasMediaSession || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: songInfo?.title || 'Unknown Song',
        artist: songInfo?.artist || 'Unknown Artist',
        album: 'Melophobia - Round Result',
        artwork: [
          { src: '/vinyl-clean.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = 'paused';
    } catch (e) {
      // ignore
    }
  }, []);

  const clearMediaSession = useCallback(() => {
    if (!hasMediaSession) return;
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch (e) {
      // ignore
    }
  }, []);

  // Sanitize iframe title and aria-label so screen readers / notification aggregators cannot peek
  const sanitizeIframeTitle = useCallback(() => {
    try {
      const container = document.getElementById(containerIdRef.current || 'gts-yt-player');
      const iframe = container?.tagName === 'IFRAME' ? container : container?.querySelector('iframe');
      if (iframe) {
        if (iframe.getAttribute('title') !== 'Melophobia Audio') {
          iframe.setAttribute('title', 'Melophobia Audio');
        }
        if (iframe.getAttribute('aria-label') !== 'Melophobia Audio') {
          iframe.setAttribute('aria-label', 'Melophobia Audio');
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Block native media notification skip/scrub controls from leaking YouTube internals
  useEffect(() => {
    if (!hasMediaSession) return;
    const dummy = () => {};
    const actions = ['play', 'pause', 'stop', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward'];
    actions.forEach((act) => {
      try {
        navigator.mediaSession.setActionHandler(act, dummy);
      } catch (e) {}
    });
    return () => {
      actions.forEach((act) => {
        try {
          navigator.mediaSession.setActionHandler(act, null);
        } catch (e) {}
      });
    };
  }, []);

  // Observer to constantly enforce iframe title masking whenever YT API injects or alters the iframe
  useEffect(() => {
    const target = document.getElementById(containerIdRef.current || 'gts-yt-player')?.parentElement || document.body;
    const observer = new MutationObserver(() => {
      if (!isRevealedRef.current) {
        sanitizeIframeTitle();
      }
    });

    observer.observe(target, {
      attributes: true,
      subtree: true,
      childList: true,
      attributeFilter: ['title', 'aria-label'],
    });

    return () => observer.disconnect();
  }, [sanitizeIframeTitle]);

  // Load the IFrame API script once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiLoaded(true);
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setApiLoaded(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      setApiLoaded(true);
    };
  }, []);

  const initPlayer = useCallback((containerId) => {
    if (!apiLoaded || playerRef.current) return;
    containerIdRef.current = containerId;

    playerRef.current = new window.YT.Player(containerId, {
      height: '200',
      width: '200',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          setReady(true);
          sanitizeIframeTitle();
        },
        onStateChange: (e) => {
          // Whenever playback or buffering starts, re-apply stealth metadata and sanitize
          if (e.data === 1 || e.data === 3) {
            if (!isRevealedRef.current) {
              applyStealthMediaSession();
              sanitizeIframeTitle();
            }
          }
        },
        onError: (e) => console.warn('[YT] Player error:', e.data),
      },
    });
  }, [apiLoaded, applyStealthMediaSession, sanitizeIframeTitle]);

  // Call this during a user interaction (like clicking "Join Game" or "Start Game")
  // to ensure the browser allows subsequent programmatic playback
  const unlockAudio = useCallback(() => {
    if (!playerRef.current?.playVideo) return;
    try {
      playerRef.current.setVolume(100);
      playerRef.current.unMute();
    } catch (e) {
      // ignore
    }
  }, []);

  const playSong = useCallback((videoId, startSeconds = 0, durationSeconds = 15) => {
    if (!playerRef.current?.loadVideoById) return;

    isRevealedRef.current = false;
    applyStealthMediaSession();
    sanitizeIframeTitle();

    // High frequency guard during round play to squash any asynchronous YouTube mediaSession updates
    if (stealthIntervalRef.current) {
      clearInterval(stealthIntervalRef.current);
    }
    stealthIntervalRef.current = setInterval(() => {
      if (!isRevealedRef.current) {
        applyStealthMediaSession();
        sanitizeIframeTitle();
      }
    }, 250);

    playerRef.current.loadVideoById({
      videoId,
      startSeconds,
      endSeconds: startSeconds + durationSeconds,
    });
  }, [applyStealthMediaSession, sanitizeIframeTitle]);

  const stop = useCallback(() => {
    if (stealthIntervalRef.current) {
      clearInterval(stealthIntervalRef.current);
      stealthIntervalRef.current = null;
    }
    try {
      playerRef.current?.stopVideo();
    } catch (e) {
      // player may not be ready
    }
    // Only clear media session if not currently in revealed state (so results remain visible in notification)
    if (!isRevealedRef.current) {
      clearMediaSession();
    }
  }, [clearMediaSession]);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo();
    } catch (e) {
      // ignore
    }
  }, []);

  const destroy = useCallback(() => {
    if (stealthIntervalRef.current) {
      clearInterval(stealthIntervalRef.current);
      stealthIntervalRef.current = null;
    }
    clearMediaSession();
    try {
      playerRef.current?.destroy();
    } catch (e) {
      // ignore
    }
    playerRef.current = null;
    setReady(false);
  }, [clearMediaSession]);

  return {
    initPlayer,
    playSong,
    stop,
    pause,
    destroy,
    ready,
    apiLoaded,
    containerRef,
    unlockAudio,
    revealSong,
    clearMediaSession,
  };
}
