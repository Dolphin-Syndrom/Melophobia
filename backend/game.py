"""Game engine — state machine, round management, answer processing."""

from __future__ import annotations

import asyncio
import logging
import random
import time
import uuid
from typing import Optional

from models import (
    AnswerOption,
    GameStatus,
    Player,
    PlayerAnswer,
    Room,
    RoundData,
    Song,
)
from scoring import calculate_points
from youtube import generate_playlist

logger = logging.getLogger(__name__)


async def prepare_game(room: Room) -> tuple[bool, str]:
    """Generate playlist and prepare the room for a game.

    Returns (success, error_message).
    """
    settings = room.settings
    try:
        playlist = await generate_playlist(
            settings.genres,
            settings.artists,
            settings.song_count,
        )
    except Exception as e:
        logger.error(f"Playlist generation failed: {e}")
        return False, "Failed to generate playlist. Try again."

    if len(playlist) < settings.song_count:
        if len(playlist) < 3:
            return False, f"Only found {len(playlist)} songs. Need at least 3."

    room.pool = playlist
    room.playlist = playlist[: settings.song_count]
    room.current_round = 0

    # Reset player scores
    for player in room.players:
        player.score = 0

    return True, ""


def start_round(room: Room) -> Optional[RoundData]:
    """Start the next round. Returns RoundData or None if game is over."""
    room.current_round += 1
    round_number = room.current_round

    if round_number > len(room.playlist):
        return None

    song = room.playlist[round_number - 1]
    options = _generate_options(song, room.pool)

    now = time.time() * 1000  # milliseconds
    duration_ms = room.settings.clip_duration * 1000

    round_data = RoundData(
        round_number=round_number,
        song=song,
        options=options,
        correct_answer_id=song.id,
        started_at=now,
        ends_at=now + duration_ms,
        start_seconds=random.randint(20, 90),
    )

    room.current_round_data = round_data
    room.status = GameStatus.PLAYING
    room.last_activity_at = time.time()

    return round_data


def _generate_options(correct_song: Song, playlist: list[Song]) -> list[AnswerOption]:
    """Generate 4 answer options including the correct song."""
    # Correct answer
    correct_option = AnswerOption(
        id=correct_song.id,
        title=correct_song.title,
        artist=correct_song.artist,
    )

    # Pick 3 wrong answers from the playlist
    other_songs = [s for s in playlist if s.id != correct_song.id]
    random.shuffle(other_songs)
    wrong_options = []
    for s in other_songs[:3]:
        wrong_options.append(AnswerOption(
            id=s.id,
            title=s.title,
            artist=s.artist,
        ))

    # If not enough songs for 4 options, pad with what we have
    options = [correct_option] + wrong_options
    random.shuffle(options)
    return options


def process_answer(
    room: Room,
    player_id: str,
    round_id: str,
    answer_id: str,
) -> tuple[bool, str]:
    """Process a player's answer submission.

    Returns (success, error_message).
    """
    rd = room.current_round_data
    if rd is None:
        return False, "No active round"

    if rd.round_id != round_id:
        return False, "Wrong round"

    if room.status != GameStatus.PLAYING:
        return False, "Round is not active"

    if player_id in rd.answers:
        return False, "Already answered"

    # Check timing
    now = time.time() * 1000
    if now > rd.ends_at + 2000:  # 2s grace period for latency
        return False, "Time's up"

    # Validate answer option exists
    valid_ids = {o.id for o in rd.options}
    if answer_id not in valid_ids:
        return False, "Invalid answer option"

    # Validate player is in room
    player = next((p for p in room.players if p.id == player_id), None)
    if player is None:
        return False, "Player not in room"

    # Record answer
    correct = answer_id == rd.correct_answer_id
    answer = PlayerAnswer(
        player_id=player_id,
        answer_id=answer_id,
        timestamp=now,
        correct=correct,
    )
    rd.answers[player_id] = answer

    return True, ""


def end_round(room: Room) -> dict:
    """End the current round, calculate scores, and return results."""
    rd = room.current_round_data
    if rd is None:
        return {}

    # Sort correct answers by timestamp to determine positions
    correct_answers = sorted(
        [a for a in rd.answers.values() if a.correct],
        key=lambda a: a.timestamp,
    )

    # Assign points
    for position, answer in enumerate(correct_answers, 1):
        points = calculate_points(position)
        answer.points = points
        # Update player score
        player = next((p for p in room.players if p.id == answer.player_id), None)
        if player:
            player.score += points

    # Wrong answers get 0
    for answer in rd.answers.values():
        if not answer.correct:
            answer.points = 0

    # Build result payload
    correct_song = rd.song
    player_results = []
    for player in room.players:
        ans = rd.answers.get(player.id)
        if ans:
            player_results.append({
                "playerId": player.id,
                "username": player.username,
                "correct": ans.correct,
                "points": ans.points,
                "answerId": ans.answer_id,
            })
        else:
            player_results.append({
                "playerId": player.id,
                "username": player.username,
                "correct": False,
                "points": 0,
                "answerId": None,
            })

    room.status = GameStatus.REVEALING
    room.last_activity_at = time.time()

    return {
        "correctAnswer": {
            "id": correct_song.id,
            "title": correct_song.title,
            "artist": correct_song.artist,
        },
        "playerResults": player_results,
    }


def check_all_answered(room: Room) -> bool:
    """Check if all connected players have answered."""
    rd = room.current_round_data
    if rd is None:
        return False

    connected_ids = {p.id for p in room.players if p.connected}
    answered_ids = set(rd.answers.keys())

    return connected_ids.issubset(answered_ids)


def is_final_round(room: Room) -> bool:
    """Check if the current round is the last one."""
    return room.current_round >= len(room.playlist)


def finish_game(room: Room) -> dict:
    """Finish the game and return final standings."""
    room.status = GameStatus.FINISHED
    room.last_activity_at = time.time()

    standings = sorted(
        [
            {
                "id": p.id,
                "username": p.username,
                "score": p.score,
            }
            for p in room.players
        ],
        key=lambda x: x["score"],
        reverse=True,
    )

    return {"standings": standings}


def reset_game(room: Room):
    """Reset the room for a new game (Play Again)."""
    room.status = GameStatus.LOBBY
    room.current_round = 0
    room.current_round_data = None
    room.playlist = []
    for player in room.players:
        player.score = 0
    room.last_activity_at = time.time()
