"""WebSocket connection management and event broadcasting."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# room_code -> { player_id: WebSocket }
_connections: dict[str, dict[str, WebSocket]] = {}

# Rate limiting
_rate_limits: dict[str, float] = {}  # "player_id:action" -> last_timestamp
RATE_LIMIT_ANSWER = 1.0  # seconds
RATE_LIMIT_REACTION = 0.5


def register_connection(room_code: str, player_id: str, ws: WebSocket):
    """Register a WebSocket connection for a player in a room."""
    if room_code not in _connections:
        _connections[room_code] = {}
    _connections[room_code][player_id] = ws


def unregister_connection(room_code: str, player_id: str):
    """Remove a WebSocket connection."""
    if room_code in _connections:
        _connections[room_code].pop(player_id, None)
        if not _connections[room_code]:
            del _connections[room_code]


def get_connection(room_code: str, player_id: str) -> Optional[WebSocket]:
    """Get a WebSocket connection."""
    return _connections.get(room_code, {}).get(player_id)


async def send_to_player(room_code: str, player_id: str, event: dict):
    """Send an event to a specific player."""
    ws = get_connection(room_code, player_id)
    if ws:
        try:
            await ws.send_json(event)
        except Exception as e:
            logger.debug(f"Failed to send to {player_id}: {e}")


async def broadcast(room_code: str, event: dict, exclude: Optional[str] = None):
    """Broadcast an event to all players in a room."""
    conns = _connections.get(room_code, {})
    tasks = []
    for pid, ws in conns.items():
        if pid == exclude:
            continue
        tasks.append(_safe_send(ws, event))
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


async def _safe_send(ws: WebSocket, event: dict):
    """Send JSON to a WebSocket, ignoring errors."""
    try:
        await ws.send_json(event)
    except Exception:
        pass


def check_rate_limit(player_id: str, action: str, interval: float) -> bool:
    """Check if an action is rate-limited. Returns True if allowed."""
    key = f"{player_id}:{action}"
    now = time.time()
    last = _rate_limits.get(key, 0)
    if now - last < interval:
        return False
    _rate_limits[key] = now
    return True


def get_connections_count(room_code: str) -> int:
    """Get number of active connections in a room."""
    return len(_connections.get(room_code, {}))
