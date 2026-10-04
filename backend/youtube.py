"""YouTube Data API integration for song discovery."""

from __future__ import annotations

import os
import random
import re
import logging
from typing import Optional

import httpx

from models import Song

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

# Duration filter: videos between 1 and 10 minutes are likely songs
MIN_DURATION_SECONDS = 60
MAX_DURATION_SECONDS = 600

# Words that suggest non-music content
NEGATIVE_KEYWORDS = [
    "interview", "podcast", "reaction", "review", "behind the scenes",
    "making of", "tutorial", "how to", "live stream", "shorts",
    "compilation", "mashup", "cover by", "karaoke", "instrumental",
    "explained", "breakdown", "unboxing", "jukebox", "mix", "playlist", 
    "collection", "hits", "best of", "megamix", "nonstop", "audio jukebox",
]

# Search query templates per genre
GENRE_QUERIES = {
    "english": ["English pop song official video", "English hit single"],
    "hindi": ["official Hindi song music video", "Hindi single track official"],
    "90s-hindi": ["official 90s Hindi song music video", "90s Hindi hit track official"],
    "pop": ["pop song official video", "pop single official"],
    "rap": ["rap song official video", "rap single official"],
    "hiphop": ["hip hop song official video", "hip hop single official"],
}

ENGLISH_PLAYLIST_ID = "PLplXQ2cg9B_qrCVd1J_iId5SvP8Kf_BfS"

# Exact YouTube Playlist IDs for curated production-grade songs
# Users can fill these in with their preferred official playlists
GENRE_PLAYLISTS = {
    "english": ENGLISH_PLAYLIST_ID,
    "hindi": "PLQdfb6nEJz_X-0Tkwec2N2Sj83d_DM36d",
    "90s-hindi": "PLjxsdvPZH24OZoxZSnuEqrW1crVtceCNG",
}

def _get_api_key() -> Optional[str]:
    return os.environ.get("YOUTUBE_API_KEY")


def _parse_title_artist(title: str, channel_title: str = "") -> tuple[str, str]:
    """Attempt to extract artist and song title from a YouTube video title.

    Common patterns:
        "Artist - Song Title (Official Video)"
        "Song Title | Artist"
        "Artist: Song Title"
    """
    # Clean common suffixes
    cleaned = re.sub(
        r'\s*[\(\[](official\s*(video|audio|music\s*video|lyric\s*video|visualizer)|'
        r'lyrics?\s*(video)?|hd|hq|full\s*video|audio|mv|4k)[\)\]]',
        '', title, flags=re.IGNORECASE
    ).strip()

    # Try "Artist - Title" pattern
    if ' - ' in cleaned:
        parts = cleaned.split(' - ', 1)
        return parts[1].strip(), parts[0].strip()

    # Try "Title | Artist"
    if ' | ' in cleaned:
        parts = cleaned.split(' | ', 1)
        return parts[0].strip(), parts[1].strip()

    # Try "Artist: Title"
    if ': ' in cleaned:
        parts = cleaned.split(': ', 1)
        return parts[1].strip(), parts[0].strip()
        
    fallback_artist = channel_title.replace(" - Topic", "").strip() if channel_title else "Unknown Artist"

    return cleaned, fallback_artist


def _is_likely_song(title: str) -> bool:
    """Check if a video title looks like a song rather than other content."""
    lower = title.lower()
    for keyword in NEGATIVE_KEYWORDS:
        if keyword in lower:
            return False
    return True


async def search_songs(
    genres: list[str],
    artists: list[str],
    count: int = 10,
    api_key: Optional[str] = None,
) -> list[Song]:
    """Search YouTube for songs matching the given criteria.

    Returns a deduplicated, randomized list of songs.
    """
    key = api_key or _get_api_key()
    if not key:
        logger.warning("No YouTube API key; using mock songs")
        return _get_mock_songs(count, genres, artists)

    genres_lower = [g.lower() for g in genres]
    is_english_only = (
        (genres_lower == ["english"] or (all(g == "english" for g in genres_lower)))
        and not artists
    )

    queries = _build_queries(genres, artists)
    if not queries and not is_english_only:
        return _get_mock_songs(count, genres, artists)

    candidates: list[Song] = []
    seen_titles: set[str] = set()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # First, pull from official curated playlists if available
        for genre in genres:
            playlist_id = GENRE_PLAYLISTS.get(genre.lower())
            if playlist_id:
                try:
                    # English uses its dedicated playlist with high limit to build full song + options pool
                    max_pl = 100 if genre.lower() == "english" else 50
                    results = await _youtube_playlist_search(client, key, playlist_id, max_results=max_pl)
                    for song in results:
                        dedup_key = f"{song.title.lower()}::{song.artist.lower()}"
                        if dedup_key not in seen_titles:
                            seen_titles.add(dedup_key)
                            candidates.append(song)
                except Exception as e:
                    logger.error(f"YouTube playlist error for genre '{genre}': {e}")

        # For English-only games, STRICTLY avoid generic YouTube searches or random tracks
        if not is_english_only and len(candidates) < max(count, 40) and queries:
            random.shuffle(queries)
            for query in queries[:min(len(queries), count + 5)]:
                try:
                    results = await _youtube_search(client, key, query, max_results=10)
                    for song in results:
                        dedup_key = f"{song.title.lower()}::{song.artist.lower()}"
                        if dedup_key not in seen_titles:
                            seen_titles.add(dedup_key)
                            candidates.append(song)
                except Exception as e:
                    logger.error(f"YouTube search error for '{query}': {e}")
                    continue

    if len(candidates) < count:
        logger.warning(f"Only found {len(candidates)} songs, needed {count}")
        # Pad with curated mock songs if needed (English mock songs come strictly from the specified playlist)
        mock = _get_mock_songs(count - len(candidates), genres, artists)
        for s in mock:
            dedup_key = f"{s.title.lower()}::{s.artist.lower()}"
            if dedup_key not in seen_titles:
                seen_titles.add(dedup_key)
                candidates.append(s)

    random.shuffle(candidates)
    return candidates


def _build_queries(genres: list[str], artists: list[str]) -> list[str]:
    """Build search queries from genres and artists."""
    queries = []

    for artist in artists:
        queries.append(f"{artist} official audio")
        queries.append(f"{artist} song")
        # Add genre-artist combos
        for genre in genres:
            if genre.lower() != "english":
                queries.append(f"{artist} {genre} song")

    for genre in genres:
        # English is strictly bound to its dedicated playlist; no generic searches
        if genre.lower() == "english":
            continue
        templates = GENRE_QUERIES.get(genre, [f"{genre} official song"])
        queries.extend(templates)
        queries.append(f"{genre} official music video")
        queries.append(f"{genre} official audio track")

    if not queries and not any(g.lower() == "english" for g in genres):
        queries = ["popular song", "hit song 2024"]

    return queries


async def _youtube_playlist_search(
    client: httpx.AsyncClient,
    api_key: str,
    playlist_id: str,
    max_results: int = 100,
) -> list[Song]:
    """Fetch videos from a specific YouTube playlist with pagination support."""
    songs = []
    seen_ids = set()
    page_token = None

    while True:
        params = {
            "part": "snippet",
            "playlistId": playlist_id,
            "maxResults": min(50, max_results - len(songs)),
            "key": api_key,
        }
        if page_token:
            params["pageToken"] = page_token

        resp = await client.get(f"{YOUTUBE_API_BASE}/playlistItems", params=params)
        resp.raise_for_status()
        data = resp.json()

        for item in data.get("items", []):
            snippet = item.get("snippet", {})
            title = snippet.get("title", "")
            resource_id = snippet.get("resourceId", {})
            video_id = resource_id.get("videoId", "")
            
            if not title or not video_id or video_id in seen_ids:
                continue
                
            if not _is_likely_song(title):
                continue

            channel_title = snippet.get("videoOwnerChannelTitle", "") or snippet.get("channelTitle", "")
            song_title, artist = _parse_title_artist(title, channel_title)
            thumb = snippet.get("thumbnails", {}).get("high", {}).get("url", "")
            
            seen_ids.add(video_id)
            songs.append(Song(
                title=song_title,
                artist=artist,
                youtube_video_id=video_id,
                thumbnail_url=thumb,
            ))
            if len(songs) >= max_results:
                break

        page_token = data.get("nextPageToken")
        if not page_token or len(songs) >= max_results:
            break

    return songs


async def _youtube_search(
    client: httpx.AsyncClient,
    api_key: str,
    query: str,
    max_results: int = 10,
) -> list[Song]:
    """Execute a YouTube Data API search."""
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "videoCategoryId": "10",  # Music category
        "maxResults": max_results,
        "key": api_key,
        "order": "relevance",
        "videoDuration": "short",
    }

    resp = await client.get(f"{YOUTUBE_API_BASE}/search", params=params)
    resp.raise_for_status()
    data = resp.json()

    songs = []
    for item in data.get("items", []):
        snippet = item.get("snippet", {})
        title = snippet.get("title", "")
        video_id = item.get("id", {}).get("videoId", "")

        if not video_id or not _is_likely_song(title):
            continue

        channel_title = snippet.get("channelTitle", "")
        song_title, artist = _parse_title_artist(title, channel_title)
        thumbnail = (
            snippet.get("thumbnails", {}).get("high", {}).get("url")
            or snippet.get("thumbnails", {}).get("default", {}).get("url")
        )

        songs.append(Song(
            title=song_title,
            artist=artist,
            youtube_video_id=video_id,
            thumbnail_url=thumbnail,
        ))

    return songs


# ─── Mock songs for development / fallback ───

MOCK_SONGS_DATA = [
    ('Blank Space', 'Taylor Swift', 'e-ORhEE9VVg', "english"),
    ('Perfect', 'Ed Sheeran', '2Vv-BfVoq4g', "english"),
    ('Rolling in the Deep', 'Adele', 'rYEDA3JcQqw', "english"),
    ('Shape of You', 'Ed Sheeran', 'JGwWNGJdvx8', "english"),
    ('Let Her Go', 'Passenger', 'RBumgq5yVrA', "english"),
    ('The Lazy Song', 'Bruno Mars', 'fLexgOxsZu0', "english"),
    ("We Don't Talk Anymore (feat. Selena Gomez)", 'Charlie Puth', '3AtDnEC4zak', "english"),
    ('Stressed Out', 'twenty one pilots', 'pXRviuL6vMY', "english"),
    ('Faded', 'Alan Walker', '60ItHLz5WEA', "english"),
    ('Lean On (feat. MØ)', 'Major Lazer & DJ Snake', 'YqeW9_5kURI', "english"),
    ('DANCE MONKEY', 'TONES AND I', 'q0hyYWKXF0Q', "english"),
    ('New Rules', 'Dua Lipa', 'k2qgadSvNyU', "english"),
    ('7 Years', 'Lukas Graham', 'LHCob76kigA', "english"),
    ('Rewrite The Stars', 'Anne-Marie & James Arthur', 'pRfmrE0ToTo', "english"),
    ('See You Again ft. Charlie Puth  Furious 7 Soundtrack', 'Wiz Khalifa', 'RgKAFK5djSk', "english"),
    ('A Thousand Years', 'Christina Perri', 'rtOvBOTyX00', "english"),
    ('Somebody That I Used To Know (feat. Kimbra)', 'Gotye', '8UVNT4wvIGY', "english"),
    ("Don't Start Now", 'Dua Lipa', 'oygrmJFKYZY', "english"),
    ('Lucid Dreams', 'Juice WRLD', 'mzB1VGEGcSU', "english"),
    ('MONEY DANCE', 'Kameron Armoúr', 'L7nbJ6Z_Gww', "english"),
    ('One Dance (Original)', 'Drake', 'm7fFVAu9eeg', "english"),
    ('SAD!', 'XXXTENTACION', 'pgN-vvVVxMA', "english"),
    ('Bamboo Ride', 'Bajton', 'mfpuotHG2Wg', "english"),
    ('2002', 'Anne-Marie', 'Il-an3K9pjg', "english"),
    ('Pumpkin Spice', 'JT Catalano', 'PeqX_Yk2jMo', "english"),
    ("I Don't Care", 'Ed Sheeran & Justin Bieber', 'y83x7MgzWOA', "english"),
    ('Happier', 'Marshmello ft. Bastille', 'm7Bc3pLyij0', "english"),
    ('Sweet but Psycho', 'Ava Max', 'WXBHCQYxwr0', "english"),
    ('Solo (feat. Demi Lovato)', 'Clean Bandit', '8JnfIa84TnU', "english"),
    ('I Like It', 'Cardi B, Bad Bunny & J Balvin', 'xTlNMmZKwpA', "english"),
    ('IDGAF', 'Dua Lipa', 'Mgfe5tIwOj0', "english"),
    ('Attention', 'Charlie Puth', 'nfs8NYg7yQM', "english"),
    ('Symphony (feat. Zara Larsson)', 'Clean Bandit', 'aatr_2MstrI', "english"),
    ('That’s What I Like', 'Bruno Mars', 'PMivT7MJ41M', "english"),
    ('Lightly Child', 'Roberto Hutchins', '0XI9sWxm2T0', "english"),
    ('Rockabye (feat. Sean Paul & Anne-Marie)', 'Clean Bandit', 'papuvlVeZg8', "english"),
    ('Heathens (from Suicide Squad: The Album)', 'twenty one pilots', 'UprcpdwuwCg', "english"),
    ('Eulogy by Axley Jade Blaze', 'Official Lyric Video', 'Gf5kqVBvfpw', "english"),
    ('Hello', 'Adele', 'YQHsXMglC9A', "english"),
    ('One Call Away', 'Charlie Puth', 'BxuY9FET9Y4', "english"),
    ('Ride', 'twenty one pilots', 'Pw-0pbY9JeU', "english"),
    ('Photograph', 'Ed Sheeran', 'nSDgHBxUbVQ', "english"),
    ('Shake It Off', 'Taylor Swift', 'nfWlot6h_JM', "english"),
    ('Thinking Out Loud', 'Ed Sheeran', 'lp-EO5I60KA', "english"),
    ('Wiggle feat. Snoop Dogg', 'Jason Derulo', 'hiP14ED28CA', "english"),
    ('THRIFT SHOP FEAT. WANZ', 'MACKLEMORE & RYAN LEWIS', 'QK8mJJJvaes', "english"),
    ('We Are Young ft. Janelle Monáe', 'Fun.', 'Sv6dMFF_yts', "english"),
    ('Someone Like You', 'Adele', 'hLQl3WQQoQ0', "english"),
    ('Titanium ft. Sia', 'David Guetta', 'JRfuAukYTKg', "english"),
    ('Grenade', 'Bruno Mars', 'SR6iYWJxHqs', "english"),
    ('High Hopes', 'Panic! At The Disco', 'IPXIgEAGe4U', "english"),
    ('FRIENDS  *OFFICIAL FRIENDZONE ANTHEM*', 'Marshmello & Anne-Marie', 'jzD_yyEcp0M', "english"),
    ('Look What You Made Me Do', 'Taylor Swift', '3tmd-ClpJxA', "english"),
    ('benny blanco, Halsey & Khalid – Eastside', 'benny blanco', '56WBK4ZK_cw', "english"),
    ('Swalla (feat. Nicki Minaj & Ty Dolla $ign)', 'Jason Derulo', 'NGLxoKOvzu4', "english"),
    ('24K Magic', 'Bruno Mars', 'UqyT8IEBkvY', "english"),
    ('Alone', 'Marshmello', 'ALZHF5UqnU4', "english"),
    ('Hymn For The Weekend', 'Coldplay', 'YykjpeuMNEk', "english"),
    ('Send My Love (To Your New Lover)', 'Adele', 'fk4BbF7B29w', "english"),
    ('Bad Blood ft. Kendrick Lamar', 'Taylor Swift', 'QcIy9NiNbmo', "english"),
    ('A Sky Full Of Stars', 'Coldplay', 'VPRjCeoBqrI', "english"),
    ("CAN'T HOLD US FEAT. RAY DALTON", 'MACKLEMORE & RYAN LEWIS', '2zNSgSzhBfM', "english"),
    ('Just The Way You Are', 'Bruno Mars', 'LjhCEhWiKXk', "english"),
    ('10,000 Hours', 'Dan + Shay, Justin Bieber', 'Y2E71oe0aSM', "english"),
    ('Best Part, a Visual', 'Daniel Caesar & H.E.R.', 'hKgl5-lkT8U', "english"),
    ('Mine', 'Bazzi', 'Gc71AmT_b2k', "english"),
    ('I Like Me Better', 'Lauv', 'BcqxLCWn-CE', "english"),
    ('Want To Want Me', 'Jason Derulo', 'rClUOdS5Zyw', "english"),
    ('Alone, Pt. II', 'Alan Walker & Ava Max', 'HhjHYkPQ8F0', "english"),
    ('Ho Hey', 'The Lumineers', 'zvCBSSwgtg4', "english"),
    ('Beautiful', 'Bazzi', '-bx_vG94LSo', "english"),
    ('Fresh Eyes', 'Andy Grammer', '5bgemCaaQkU', "english"),
    ('Cold Water (feat. Justin Bieber & MØ)', 'Major Lazer', 'nBtDsQ4fhXY', "english"),
    ('Castle On The Hill', 'Ed Sheeran', 'K0ibBPhiaG0', "english"),
    ('Alone', 'Alan Walker', '1-xGerv5FOk', "english"),
    ('DEAD WRONG', 'Dilliano Suavé', 'BXDT893P9II', "english"),
    ('To Warm a Cold Heart (feat. Sandrine Orsini)', 'The Star Prairie Project', 'sj-Dqdk-6KQ', "english"),
    ("How'd You Make That Rap Song", 'JT Catalano', 'LWAVkanBVkk', "english"),
    ('GOODBYE WORLD (VISUALISER)', 'JANOSCH MOLDAU', '7q9-ODIQle8', "english"),
    ("Tum Hi Ho", "Arijit Singh", "IJq0yyWug1k", "hindi"),
    ("Kesariya", "Arijit Singh", "BddP6PYo2gs", "hindi"),
    ("Tera Ban Jaunga", "Akhil Sachdeva", "MBk0t1dRYms", "hindi"),
    ("Apna Bana Le", "Arijit Singh", "VxfQSJzTPv4", "hindi"),
    ("Raataan Lambiyan", "Jubin Nautiyal", "gfyMEg4FE5s", "hindi"),
    ("Tujhe Dekha Toh", "Kumar Sanu & Lata Mangeshkar", "cNV5hLKh980", "hindi 90s-hindi"),
    ("Chaiyya Chaiyya", "Sukhwinder Singh", "PQmrmVs10X8", "hindi 90s-hindi"),
]


def _get_mock_songs(count: int, genres: list[str] = None, artists: list[str] = None) -> list[Song]:
    """Return mock songs for development/testing, filtered by genres/artists."""
    filtered_songs = []
    
    genres_lower = [g.lower() for g in (genres or [])]
    artists_lower = [a.lower() for a in (artists or [])]

    for title, artist, vid, song_genres in MOCK_SONGS_DATA:
        # If no filters provided, include all
        if not genres_lower and not artists_lower:
            filtered_songs.append((title, artist, vid))
            continue

        match = False
        # Check artists
        if artists_lower:
            for a in artists_lower:
                if a in artist.lower():
                    match = True
                    break
        
        # Check genres
        if not match and genres_lower:
            for g in genres_lower:
                if g in song_genres:
                    match = True
                    break
        
        if match:
            filtered_songs.append((title, artist, vid))

    # Fallback if filters are too strict and we have no songs
    if not filtered_songs:
        logger.warning(f"No mock songs found for genres={genres} artists={artists}. Falling back to all mock songs.")
        filtered_songs = [(t, a, v) for t, a, v, g in MOCK_SONGS_DATA]

    random.shuffle(filtered_songs)
    songs = []
    for title, artist, vid in filtered_songs:
        songs.append(Song(
            title=title,
            artist=artist,
            youtube_video_id=vid,
        ))
        if len(songs) >= count:
            break
            
    # If we still need more songs to meet the count, pad with random ones (avoiding duplicates if possible)
    if len(songs) < count:
        all_shuffled = [(t, a, v) for t, a, v, g in MOCK_SONGS_DATA]
        random.shuffle(all_shuffled)
        for title, artist, vid in all_shuffled:
            if len(songs) >= count:
                break
            # Only add if not already in songs list
            if not any(s.youtube_video_id == vid for s in songs):
                songs.append(Song(title=title, artist=artist, youtube_video_id=vid))
                
    return songs


async def generate_playlist(
    settings_genres: list[str],
    settings_artists: list[str],
    count: int,
) -> list[Song]:
    """Generate a complete playlist for a game session."""
    return await search_songs(settings_genres, settings_artists, count)
