"""Room management — creation, joining, leaving, host transfer, cleanup."""

from __future__ import annotations

import random
import string
import time
import logging
from typing import Optional

from models import GameSettings, GameStatus, Player, Room

logger = logging.getLogger(__name__)

# In-memory room store
_rooms: dict[str, Room] = {}

ROOM_CODE_LENGTH = 6
ROOM_INACTIVITY_TIMEOUT = 30 * 60  # 30 minutes
ROOM_MAX_LIFETIME = 4 * 60 * 60  # 4 hours
MAX_PLAYERS_PER_ROOM = 20


def _generate_code() -> str:
    """Generate a unique room code."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(100):
        code = ''.join(random.choices(chars, k=ROOM_CODE_LENGTH))
        if code not in _rooms:
            return code
    raise RuntimeError("Could not generate unique room code")


def create_room(settings: GameSettings) -> Room:
    """Create a new room with the given settings."""
    code = _generate_code()
    room = Room(code=code, settings=settings)
    _rooms[code] = room
    logger.info(f"Room created: {code}")
    return room


def get_room(code: str) -> Optional[Room]:
    """Get a room by code."""
    return _rooms.get(code)


def add_player(room: Room, username: str, player_id: Optional[str] = None) -> tuple[Player, Optional[str]]:
    """Add a player to a room. Returns (player, error_message).

    If player_id is provided and matches an existing disconnected player,
    reconnect them instead.
    """
    # Check reconnection
    if player_id:
        existing = next((p for p in room.players if p.id == player_id), None)
        if existing:
            existing.connected = True
            existing.username = username
            room.last_activity_at = time.time()
            logger.info(f"Player reconnected: {existing.username} in {room.code}")
            return existing, None

    # Validate username
    username = username.strip()
    if len(username) < 2 or len(username) > 20:
        return None, "Username must be 2-20 characters"

    # Check uniqueness
    if any(p.username.lower() == username.lower() and p.connected for p in room.players):
        return None, "Username already taken"

    # Check capacity
    connected_count = sum(1 for p in room.players if p.connected)
    if connected_count >= MAX_PLAYERS_PER_ROOM:
        return None, "Room is full"

    player = Player(username=username)
    room.players.append(player)

    # First player becomes host
    if not room.host_player_id:
        room.host_player_id = player.id

    room.last_activity_at = time.time()
    logger.info(f"Player joined: {player.username} ({player.id}) in {room.code}")
    return player, None


def remove_player(room: Room, player_id: str) -> bool:
    """Mark a player as disconnected."""
    player = next((p for p in room.players if p.id == player_id), None)
    if player:
        player.connected = False
        room.last_activity_at = time.time()
        logger.info(f"Player disconnected: {player.username} in {room.code}")
        return True
    return False


def delete_player(room: Room, player_id: str) -> bool:
    """Completely remove a player from the room (e.g. when leaving the lobby)."""
    orig_count = len(room.players)
    room.players = [p for p in room.players if p.id != player_id]
    if len(room.players) < orig_count:
        room.last_activity_at = time.time()
        logger.info(f"Player {player_id} removed from {room.code}")
        return True
    return False


def transfer_host(room: Room) -> Optional[str]:
    """Transfer host to another connected player if current host is disconnected.

    Returns new host player_id or None.
    """
    current_host = next((p for p in room.players if p.id == room.host_player_id), None)
    if current_host and current_host.connected:
        return None  # Host is still connected

    # Find a connected player
    for player in room.players:
        if player.connected and player.id != room.host_player_id:
            room.host_player_id = player.id
            logger.info(f"Host transferred to {player.username} in {room.code}")
            return player.id

    return None


def get_connected_player_count(room: Room) -> int:
    """Get the number of connected players."""
    return sum(1 for p in room.players if p.connected)


def cleanup_rooms():
    """Remove stale rooms."""
    now = time.time()
    to_remove = []
    for code, room in _rooms.items():
        inactive = now - room.last_activity_at > ROOM_INACTIVITY_TIMEOUT
        expired = now - room.created_at > ROOM_MAX_LIFETIME
        empty = get_connected_player_count(room) == 0 and now - room.last_activity_at > 60

        if inactive or expired or empty:
            to_remove.append(code)

    for code in to_remove:
        del _rooms[code]
        logger.info(f"Room cleaned up: {code}")

    return len(to_remove)


def get_room_count() -> int:
    """Get total number of active rooms."""
    return len(_rooms)
