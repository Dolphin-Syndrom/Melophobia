import React from 'react';
import { Laugh, Flame, Zap, Skull, ThumbsUp } from 'lucide-react';

const REACTION_ICONS = {
  '😂': Laugh,
  '🔥': Flame,
  '🤯': Zap,
  '💀': Skull,
  '👏': ThumbsUp,
};

export default function FloatingReactions({ reactions }) {
  return (
    <>
      {reactions.map(r => {
        const Icon = REACTION_ICONS[r.emoji];
        return (
          <div
            key={r.id}
            className="melo-floating-reaction"
            style={{
              left: `${20 + Math.random() * 60}%`,
              bottom: '15%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {Icon ? <Icon size={28} color="var(--melo-text-bright)" /> : null}
          </div>
        );
      })}
    </>
  );
}
