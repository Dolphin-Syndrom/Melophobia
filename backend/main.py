"""Melophobia — FastAPI backend.

Single-process server with in-memory rooms, WebSocket multiplayer,
and YouTube Data API integration.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

import rooms
import game
import websocket_manager as wsm
from models import (
    CreateRoomRequest,
    CreateRoomResponse,
    GameSettings,
    GameStatus,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("melo")


# ─── Lifespan ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Start background cleanup task
    cleanup_task = asyncio.create_task(_room_cleanup_loop())
    logger.info("Melophobia backend started")
    yield
    cleanup_task.cancel()
    logger.info("Melophobia backend stopped")


async def _room_cleanup_loop():
    """Periodically clean up stale rooms."""
    while True:
        try:
            await asyncio.sleep(60)
            removed = rooms.cleanup_rooms()
            if removed:
                logger.info(f"Cleaned up {removed} rooms ({rooms.get_room_count()} remaining)")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


# ─── App ────────────────────────────────────────────────────────────

app = FastAPI(title="Melophobia", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── REST endpoints ────────────────────────────────────────────────

@app.post("/api/rooms", response_model=CreateRoomResponse)
async def create_room(req: CreateRoomRequest):
    """Create a new game room."""
    settings = GameSettings(
        genres=req.genres,
        artists=req.artists,
        song_count=max(3, min(req.song_count, 20)),
        clip_duration=max(5, min(req.clip_duration, 30)),
    )
    room = rooms.create_room(settings)
    return CreateRoomResponse(code=room.code, room_id=room.id)


@app.get("/api/rooms/{code}")
async def get_room(code: str):
    """Check if a room exists."""
    room = rooms.get_room(code)
    if not room:
        return {"exists": False}
    return {
        "exists": True,
        "player_count": rooms.get_connected_player_count(room),
        "status": room.status.value,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "rooms": rooms.get_room_count()}


# ─── WebSocket endpoint ────────────────────────────────────────────

@app.websocket("/ws/{room_code}")
async def websocket_endpoint(
    ws: WebSocket,
    room_code: str,
    player_id: Optional[str] = Query(None),
):
    await ws.accept()
    logger.info(f"WS connected: room={room_code}, player_id={player_id}")

    room = rooms.get_room(room_code)
    if not room:
        await ws.send_json({"type": "error", "message": "Room not found"})
        await ws.close()
        return

    assigned_player_id = None

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type", "")

            # ── Join Room ──
            if msg_type == "join_room":
                username = data.get("username", "").strip()
                incoming_player_id = data.get("player_id") or player_id
                is_reconnect = bool(incoming_player_id and any(p.id == incoming_player_id for p in room.players))

                player, error = rooms.add_player(room, username, incoming_player_id)
                if error:
                    await ws.send_json({"type": "error", "message": error})
                    continue

                assigned_player_id = player.id
                wsm.register_connection(room_code, player.id, ws)

                # Send full room state to the joining player
                await ws.send_json(_build_room_state(room, player.id))

                # If this is a reconnection during active game, send current round
                if room.status == GameStatus.PLAYING and room.current_round_data:
                    rd = room.current_round_data
                    already = player.id in rd.answers
                    await ws.send_json({
                        "type": "round_started",
                        "payload": _build_round_payload(rd),
                    })
                    if already:
                        await ws.send_json({
                            "type": "room_state",
                            "room": _serialize_room(room),
                            "players": [_serialize_player(p) for p in room.players],
                            "player_id": player.id,
                            "already_answered": True,
                        })

                # Broadcast to others
                await wsm.broadcast(room_code, {
                    "type": "player_reconnected" if is_reconnect else "player_joined",
                    "player": _serialize_player(player),
                    "players": [_serialize_player(p) for p in room.players],
                    "player_id": player.id,
                    "username": player.username,
                }, exclude=player.id)

            # ── Start Game ──
            elif msg_type == "start_game":
                if not assigned_player_id:
                    await ws.send_json({"type": "error", "message": "Not joined"})
                    continue

                if assigned_player_id != room.host_player_id:
                    await ws.send_json({"type": "error", "message": "Only host can start"})
                    continue

                if room.status != GameStatus.LOBBY:
                    await ws.send_json({"type": "error", "message": "Game already in progress"})
                    continue

                # Generate playlist and start
                room.status = GameStatus.STARTING
                await wsm.broadcast(room_code, {
                    "type": "game_starting",
                    "countdown": "Preparing...",
                })

                # Run game in background
                asyncio.create_task(_run_game(room_code))

            # ── Submit Answer ──
            elif msg_type == "submit_answer":
                if not assigned_player_id:
                    continue

                if not wsm.check_rate_limit(assigned_player_id, "answer", wsm.RATE_LIMIT_ANSWER):
                    continue

                round_id = data.get("round_id", "")
                answer_id = data.get("answer_id", "")

                success, error = game.process_answer(
                    room, assigned_player_id, round_id, answer_id
                )

                if not success:
                    await ws.send_json({"type": "error", "message": error})
                    continue

                # Broadcast that player answered (no details)
                await wsm.broadcast(room_code, {
                    "type": "player_answered",
                    "player_id": assigned_player_id,
                })

                # Check if all players answered
                if game.check_all_answered(room):
                    await _end_current_round(room_code)

            # ── Send Reaction ──
            elif msg_type == "send_reaction":
                if not assigned_player_id:
                    continue

                if not wsm.check_rate_limit(assigned_player_id, "reaction", wsm.RATE_LIMIT_REACTION):
                    continue

                emoji = data.get("emoji", "")
                allowed = {"😂", "🔥", "🤯", "💀", "👏"}
                if emoji not in allowed:
                    continue

                await wsm.broadcast(room_code, {
                    "type": "reaction_received",
                    "emoji": emoji,
                    "player_id": assigned_player_id,
                })

            # ── Play Again ──
            elif msg_type == "play_again":
                if not assigned_player_id:
                    continue

                if assigned_player_id != room.host_player_id:
                    await ws.send_json({"type": "error", "message": "Only host can restart"})
                    continue

                game.reset_game(room)

                await wsm.broadcast(room_code, {
                    "type": "room_reset",
                    "players": [_serialize_player(p) for p in room.players],
                })

            # ── Leave Room ──
            elif msg_type == "leave_room":
                if assigned_player_id:
                    await _handle_disconnect(room_code, assigned_player_id)
                    assigned_player_id = None
                break

    except WebSocketDisconnect:
        logger.info(f"WS disconnected: room={room_code}, player={assigned_player_id}")
    except Exception as e:
        logger.error(f"WS error: {e}", exc_info=True)
    finally:
        if assigned_player_id:
            await _handle_disconnect(room_code, assigned_player_id)


# ─── Game Loop ──────────────────────────────────────────────────────

async def _run_game(room_code: str):
    """Background task that runs the game loop."""
    room = rooms.get_room(room_code)
    if not room:
        return

    # Prepare playlist first so there's no lag after the countdown
    success, error = await game.prepare_game(room)
    if not success:
        await wsm.broadcast(room_code, {
            "type": "error",
            "message": error or "Failed to prepare game",
        })
        room.status = GameStatus.LOBBY
        return

    # Countdown
    for i in range(5, 0, -1):
        await wsm.broadcast(room_code, {
            "type": "countdown_tick",
            "value": i,
        })
        await asyncio.sleep(1)

    # Game rounds
    while True:
        rd = game.start_round(room)
        if rd is None:
            break

        # Broadcast round start
        await wsm.broadcast(room_code, {
            "type": "round_started",
            "payload": _build_round_payload(rd),
        })

        # Wait for timer to expire (or all answered)
        duration_sec = room.settings.clip_duration + 2  # +2s buffer
        for _ in range(int(duration_sec * 10)):
            if room.status != GameStatus.PLAYING:
                break
            await asyncio.sleep(0.1)

        # End round if not already ended
        if room.status == GameStatus.PLAYING:
            await _end_current_round(room_code)

        # Wait for reveal
        await asyncio.sleep(3)

        # Check if game is over
        if game.is_final_round(room):
            break

    # Finish game
    final_results = game.finish_game(room)
    await wsm.broadcast(room_code, {
        "type": "game_finished",
        "payload": final_results,
    })


async def _end_current_round(room_code: str):
    """End the current round and broadcast results."""
    room = rooms.get_room(room_code)
    if not room or room.status != GameStatus.PLAYING:
        return

    results = game.end_round(room)
    is_final = game.is_final_round(room)
    results["isFinalRound"] = is_final
    results["waitDuration"] = 3000
    results["roundNumber"] = room.current_round
    results["totalRounds"] = len(room.playlist)
    results["players"] = [_serialize_player(p) for p in room.players]

    await wsm.broadcast(room_code, {
        "type": "round_ended",
        "payload": results,
    })

    # Send updated scores
    scores = {p.id: p.score for p in room.players}
    await wsm.broadcast(room_code, {
        "type": "score_updated",
        "scores": scores,
    })


# ─── Disconnect Handling ───────────────────────────────────────────

async def _handle_disconnect(room_code: str, player_id: str):
    """Handle player disconnect."""
    wsm.unregister_connection(room_code, player_id)
    room = rooms.get_room(room_code)
    if not room:
        return

    player = next((p for p in room.players if p.id == player_id), None)
    player_name = player.username if player else "A player"

    if room.status == GameStatus.LOBBY:
        rooms.delete_player(room, player_id)
        await wsm.broadcast(room_code, {
            "type": "player_left",
            "player_id": player_id,
            "username": player_name,
        })
    else:
        rooms.remove_player(room, player_id)
        await wsm.broadcast(room_code, {
            "type": "player_disconnected",
            "player_id": player_id,
            "username": player_name,
        })

    # Check if host disconnected
    if player_id == room.host_player_id:
        new_host_id = rooms.transfer_host(room)
        if new_host_id:
            new_host = next((p for p in room.players if p.id == new_host_id), None)
            await wsm.broadcast(room_code, {
                "type": "host_changed",
                "new_host_id": new_host_id,
                "new_host_name": new_host.username if new_host else "Unknown",
            })

    # If during gameplay and all remaining answered, end round
    if room.status == GameStatus.PLAYING and game.check_all_answered(room):
        await _end_current_round(room_code)


# ─── Serialization Helpers ──────────────────────────────────────────

def _serialize_room(room) -> dict:
    return {
        "id": room.id,
        "code": room.code,
        "hostPlayerId": room.host_player_id,
        "status": room.status.value,
        "settings": {
            "genres": room.settings.genres,
            "artists": room.settings.artists,
            "songCount": room.settings.song_count,
            "clipDuration": room.settings.clip_duration,
        },
        "currentRound": room.current_round,
    }


def _serialize_player(player) -> dict:
    return {
        "id": player.id,
        "username": player.username,
        "score": player.score,
        "connected": player.connected,
    }


def _build_room_state(room, player_id: str) -> dict:
    return {
        "type": "room_state",
        "room": _serialize_room(room),
        "players": [_serialize_player(p) for p in room.players],
        "player_id": player_id,
    }


def _build_round_payload(rd) -> dict:
    return {
        "roundId": rd.round_id,
        "roundNumber": rd.round_number,
        "startedAt": rd.started_at,
        "endsAt": rd.ends_at,
        "startSeconds": rd.start_seconds,
        "song": {
            "youtubeVideoId": rd.song.youtube_video_id,
        },
        "options": [
            {
                "id": opt.id,
                "title": opt.title,
                "artist": opt.artist,
            }
            for opt in rd.options
        ],
    }


# ─── Entry point ────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
