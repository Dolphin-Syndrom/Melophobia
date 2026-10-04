import { useRef, useCallback, useEffect, useState } from 'react';
import { WS_URL } from '../constants.js';

const RECONNECT_DELAYS = [500, 1000, 2000, 4000];

export default function useGameSocket({ onMessage, onOpen, onClose }) {
  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const pendingJoinRef = useRef(null);

  // Store latest callbacks in refs to avoid re-creating the WebSocket on every render
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const connect = useCallback((roomCode, playerId, onConnected) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      onConnected?.();
      return;
    }

    intentionalCloseRef.current = false;
    pendingJoinRef.current = onConnected || null;

    let url = `${WS_URL}/${roomCode}`;
    if (playerId) url += `?player_id=${playerId}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptRef.current = 0;
        onOpenRef.current?.();
        // Fire the pending join callback
        if (pendingJoinRef.current) {
          pendingJoinRef.current();
          pendingJoinRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (e) {
          console.error('[melo] Invalid message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        onCloseRef.current?.();

        if (!intentionalCloseRef.current) {
          const attempt = reconnectAttemptRef.current;
          if (attempt < RECONNECT_DELAYS.length) {
            const delay = RECONNECT_DELAYS[attempt];
            reconnectAttemptRef.current += 1;
            reconnectTimerRef.current = setTimeout(() => {
              connect(roomCode, playerId);
            }, delay);
          }
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch (e) {
      console.error('[melo] WebSocket connection error:', e);
    }
  }, []);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearTimeout(reconnectTimerRef.current);
    pendingJoinRef.current = null;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { connect, disconnect, send, connected };
}
