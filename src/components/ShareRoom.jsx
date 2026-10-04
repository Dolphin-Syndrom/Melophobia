import React, { useState, useCallback } from 'react';
import { Link2, Copy, Check } from 'lucide-react';

export default function ShareRoom({ roomCode, showToast }) {
  const shareUrl = `${window.location.origin}/room/${roomCode}`;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    showToast?.('✓ Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl, showToast]);

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <p className="melo-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Link2 size={16} /> Share this link
        </p>
        {copied && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--melo-text-bright)',
              background: 'rgba(7, 9, 14, 0.08)',
              padding: '2px 8px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              animation: 'meloToastPop 0.2s ease-out',
            }}
          >
            <Check size={12} /> Copied!
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--melo-bg)', borderRadius: '18px', border: '1.5px solid rgba(255, 255, 255, 0.65)', padding: '6px', boxShadow: 'var(--neo-in)' }}>
        <input
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '10px 16px', color: 'var(--melo-text)', fontFamily: 'var(--melo-font)', fontSize: '0.85rem' }}
          readOnly
          value={shareUrl}
        />
        <button
          className={`melo-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopyLink}
          aria-label="Copy link"
        >
          {copied ? (
            <Check size={16} color="var(--melo-text-bright)" style={{ animation: 'meloToastPop 0.2s ease-out' }} />
          ) : (
            <Copy size={16} color="var(--melo-text-bright)" />
          )}
        </button>
      </div>
    </div>
  );
}
