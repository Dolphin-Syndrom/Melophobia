import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Hook to manage the YouTube IFrame Player API.
 * Hides the player visually; only used for audio playback.
 */
export default function useYouTubePlayer() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);

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
        onReady: () => setReady(true),
        onError: (e) => console.warn('[YT] Player error:', e.data),
      },
    });
  }, [apiLoaded]);

  // Call this during a user interaction (like clicking "Join Game" or "Start Game")
  // to ensure the browser allows subsequent programmatic playback
  const unlockAudio = useCallback(() => {
    if (!playerRef.current?.playVideo) return;
    try {
      playerRef.current.setVolume(100);
      playerRef.current.unMute();
      // We don't necessarily want to play an actual video here yet, 
      // but if a video is loaded, we can play and immediately pause it.
      // Or simply calling unMute() on a user gesture is often enough for the YT API.
    } catch (e) {
      // ignore
    }
  }, []);

  const playSong = useCallback((videoId, startSeconds = 0, durationSeconds = 15) => {
    if (!playerRef.current?.loadVideoById) return;
    playerRef.current.loadVideoById({
      videoId,
      startSeconds,
      endSeconds: startSeconds + durationSeconds,
    });
  }, []);

  const stop = useCallback(() => {
    try {
      playerRef.current?.stopVideo();
    } catch (e) {
      // player may not be ready
    }
  }, []);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo();
    } catch (e) {
      // ignore
    }
  }, []);

  const destroy = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch (e) {
      // ignore
    }
    playerRef.current = null;
    setReady(false);
  }, []);

  return { initPlayer, playSong, stop, pause, destroy, ready, apiLoaded, containerRef, unlockAudio };
}
