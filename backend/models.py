"""Pydantic models for Melophobia."""

from __future__ import annotations

import time
import uuid
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class GameStatus(str, Enum):
    LOBBY = "lobby"
    STARTING = "starting"
    PLAYING = "playing"
    REVEALING = "revealing"
    FINISHED = "finished"


class Song(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str
    artist: str
    youtube_video_id: str
    thumbnail_url: Optional[str] = None


class AnswerOption(BaseModel):
    id: str
    title: str
    artist: str


class GameSettings(BaseModel):
    genres: list[str] = []
    artists: list[str] = []
    song_count: int = 10
    clip_duration: int = 15


class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    score: int = 0
    connected: bool = True
    joined_at: float = Field(default_factory=time.time)


class RoundData(BaseModel):
    round_id: str = Field(default_factory=lambda: f"r_{uuid.uuid4().hex[:8]}")
    round_number: int
    song: Song
    options: list[AnswerOption]
    correct_answer_id: str
    started_at: float = 0.0
    ends_at: float = 0.0
    start_seconds: int = 0
    answers: dict[str, PlayerAnswer] = {}  # player_id -> answer


class PlayerAnswer(BaseModel):
    player_id: str
    answer_id: str
    timestamp: float
    correct: bool = False
    points: int = 0


class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    host_player_id: str = ""
    status: GameStatus = GameStatus.LOBBY
    settings: GameSettings = Field(default_factory=GameSettings)
    players: list[Player] = []
    playlist: list[Song] = []
    pool: list[Song] = []
    current_round: int = 0
    current_round_data: Optional[RoundData] = None
    created_at: float = Field(default_factory=time.time)
    last_activity_at: float = Field(default_factory=time.time)


class CreateRoomRequest(BaseModel):
    genres: list[str] = []
    artists: list[str] = []
    song_count: int = 10
    clip_duration: int = 15


class CreateRoomResponse(BaseModel):
    code: str
    room_id: str
