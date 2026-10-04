import { useState, useEffect, useRef, useCallback } from 'react';

export default function useRoundTimer(endsAt) {
  const [remaining, setRemaining] = useState(null);
  const rafRef = useRef(null);

  const tick = useCallback(() => {
    if (!endsAt) return;
    const ms = Math.max(0, endsAt - Date.now());
    setRemaining(Math.ceil(ms / 1000));
    if (ms > 0) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(null);
      return;
    }
    tick();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [endsAt, tick]);

  return remaining;
}
