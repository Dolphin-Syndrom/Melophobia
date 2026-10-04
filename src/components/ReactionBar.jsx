import React, { useRef, useCallback } from 'react';
import { Laugh, Flame, Zap, Skull, ThumbsUp } from 'lucide-react';

const REACTION_CONFIG = [
  { id: '😂', icon: Laugh },
  { id: '🔥', icon: Flame },
  { id: '🤯', icon: Zap },
  { id: '💀', icon: Skull },
  { id: '👏', icon: ThumbsUp },
];

export default function ReactionBar({ onReaction }) {
  const lastReactionRef = useRef(0);

  const handleReaction = useCallback((emoji) => {
    const now = Date.now();
    if (now - lastReactionRef.current < 500) return; // rate limit
    lastReactionRef.current = now;
    onReaction?.(emoji);
  }, [onReaction]);

  return (
    <div className="melo-reactions-bar">
      {REACTION_CONFIG.map(({ id, icon: Icon }) => (
        <button
          key={id}
          className="melo-reaction-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => handleReaction(id)}
          aria-label={id}
        >
          <Icon size={20} color="var(--melo-text-bright)" />
        </button>
      ))}
    </div>
  );
}
