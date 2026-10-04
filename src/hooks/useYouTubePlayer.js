import { useRef, useCallback, useState, useEffect } from 'react';

const hasMediaSession = typeof window !== 'undefined' && 'mediaSession' in navigator;

const SILENT_CARRIER_URI =
  'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

const STEALTH_METADATA = {
  title: 'Guess the Track 🎵',
  artist: 'Melophobia',
  album: 'Round in Progress...',
  artwork: [
    { src: '/vinyl-clean.png', sizes: '512x512', type: 'image/png' },
    { src: '/music-syllable.png', sizes: '128x128', type: 'image/png' },
  ],
};

/**
 * Hook to manage YouTube IFrame Audio Playback with a Stealth MediaSession Protection System.
 *
 * Prevents mobile notification bars (Android Chrome, iOS Safari), lockscreens,
 * and desktop media overlays from leaking the song title or artist while rounds are running.
 * The true track details are revealed only when everyone makes their choice or time runs out.
 */
export default function useYouTubePlayer() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const containerIdRef = useRef('melo-yt-player');
  const stealthIntervalRef = useRef(null);
  const stealthActiveRef = useRef(false);
  const isRevealedRef = useRef(false);
  const carrierAudioRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

  // Initialize carrier audio element to anchor top-level media session focus on mobile devices
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.src = '/carrier.wav';
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.01; // minimal volume so OS media engine treats it as active player

    // Fallback to embedded base64 wav if file fails to load
    audio.onerror = () => {
      if (audio.src !== SILENT_CARRIER_URI) {
        audio.src = SILENT_CARRIER_URI;
      }
    };

    carrierAudioRef.current = audio;

    return () => {
      try {
        audio.pause();
        audio.src = '';
      } catch (e) {}
    };
  }, []);

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

  // Revealed MediaSession applier (called strictly when round answers are revealed)
  const revealSong = useCallback((songInfo) => {
    isRevealedRef.current = true;
    stealthActiveRef.current = false;

    if (stealthIntervalRef.current) {
      clearInterval(stealthIntervalRef.current);
      stealthIntervalRef.current = null;
    }

    // Pause carrier audio since round ended
    if (carrierAudioRef.current) {
      try {
        carrierAudioRef.current.pause();
      } catch (e) {}
    }

    if (!hasMediaSession || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: songInfo?.title || 'Unknown Song',
        artist: songInfo?.artist || 'Unknown Artist',
        album: 'Melophobia • Round Result',
        artwork: [
          { src: '/vinyl-clean.png', sizes: '512x512', type: 'image/png' },
          { src: '/music-syllable.png', sizes: '128x128', type: 'image/png' },
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

  // Sanitize iframe title, aria-label, and name to prevent DOM/accessibility title leaks
  const sanitizeIframeTitle = useCallback(() => {
    try {
      const container = document.getElementById(containerIdRef.current || 'melo-yt-player');
      const iframe =
        container?.tagName === 'IFRAME'
          ? container
          : container?.querySelector('iframe') || document.querySelector('iframe[src*="youtube"]');

      if (iframe) {
        if (iframe.getAttribute('title') !== 'Melophobia Audio') {
          iframe.setAttribute('title', 'Melophobia Audio');
        }
        if (iframe.getAttribute('aria-label') !== 'Melophobia Audio') {
          iframe.setAttribute('aria-label', 'Melophobia Audio');
        }
        if (iframe.title !== 'Melophobia Audio') {
          iframe.title = 'Melophobia Audio';
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Intercept and enforce stealth metadata on navigator.mediaSession to block external/YouTube leaks
  useEffect(() => {
    if (!hasMediaSession) return;

    try {
      const proto = Object.getPrototypeOf(navigator.mediaSession) || navigator.mediaSession;
      const originalDesc = Object.getOwnPropertyDescriptor(proto, 'metadata');

      if (originalDesc && originalDesc.set) {
        Object.defineProperty(navigator.mediaSession, 'metadata', {
          configurable: true,
          enumerable: true,
          get() {
            return originalDesc.get ? originalDesc.get.call(navigator.mediaSession) : null;
          },
          set(val) {
            // Block external attempts to leak song metadata during active round
            if (stealthActiveRef.current && !isRevealedRef.current) {
              originalDesc.set.call(navigator.mediaSession, new window.MediaMetadata(STEALTH_METADATA));
              return;
            }
            originalDesc.set.call(navigator.mediaSession, val);
          },
        });
      }
    } catch (e) {
      // ignore fallback
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

  // DOM observer to constantly enforce iframe title masking whenever YT API injects or alters the iframe
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!isRevealedRef.current) {
        sanitizeIframeTitle();
      }
    });

    observer.observe(document.body, {
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

  const initPlayer = useCallback(
    (containerId = 'melo-yt-player') => {
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
    },
    [apiLoaded, applyStealthMediaSession, sanitizeIframeTitle]
  );

  // Call during user gesture (e.g. Join Game, Start Game) to prime audio playback on mobile browsers
  const unlockAudio = useCallback(() => {
    if (carrierAudioRef.current) {
      carrierAudioRef.current
        .play()
        .then(() => {
          carrierAudioRef.current.pause();
        })
        .catch(() => {});
    }

    if (!playerRef.current?.playVideo) return;
    try {
      playerRef.current.setVolume(100);
      playerRef.current.unMute();
    } catch (e) {
      // ignore
    }
  }, []);

  const playSong = useCallback(
    (videoId, startSeconds = 0, durationSeconds = 15) => {
      if (!playerRef.current?.loadVideoById) return;

      isRevealedRef.current = false;
      stealthActiveRef.current = true;

      // Start top-level carrier audio to secure mobile OS media session focus on Melophobia
      if (carrierAudioRef.current) {
        try {
          carrierAudioRef.current.currentTime = 0;
          const p = carrierAudioRef.current.play();
          if (p !== undefined) p.catch(() => {});
        } catch (e) {}
      }

      applyStealthMediaSession();
      sanitizeIframeTitle();

      // High frequency lock during round play to squash any asynchronous updates
      if (stealthIntervalRef.current) {
        clearInterval(stealthIntervalRef.current);
      }
      stealthIntervalRef.current = setInterval(() => {
        if (!isRevealedRef.current) {
          applyStealthMediaSession();
          sanitizeIframeTitle();
        }
      }, 200);

      playerRef.current.loadVideoById({
        videoId,
        startSeconds,
        endSeconds: startSeconds + durationSeconds,
      });
    },
    [applyStealthMediaSession, sanitizeIframeTitle]
  );

  const stop = useCallback(() => {
    stealthActiveRef.current = false;
    if (stealthIntervalRef.current) {
      clearInterval(stealthIntervalRef.current);
      stealthIntervalRef.current = null;
    }

    if (carrierAudioRef.current) {
      try {
        carrierAudioRef.current.pause();
        carrierAudioRef.current.currentTime = 0;
      } catch (e) {}
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
    if (carrierAudioRef.current) {
      try {
        carrierAudioRef.current.pause();
      } catch (e) {}
    }
    try {
      playerRef.current?.pauseVideo();
    } catch (e) {
      // ignore
    }
  }, []);

  const destroy = useCallback(() => {
    stealthActiveRef.current = false;
    if (stealthIntervalRef.current) {
      clearInterval(stealthIntervalRef.current);
      stealthIntervalRef.current = null;
    }

    if (carrierAudioRef.current) {
      try {
        carrierAudioRef.current.pause();
        carrierAudioRef.current.src = '';
      } catch (e) {}
      carrierAudioRef.current = null;
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
