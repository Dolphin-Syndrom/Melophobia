"""Scoring calculation for Guess the Song.

Uses a time-decay formula where the fastest players to answer correctly
earn maximum points based on how quickly they guessed. Points smoothly
decay from MAX_POINTS (1000) down to MIN_POINTS (200) across the round clip duration,
with speed rank bonuses for the first players to guess.
"""

MAX_POINTS = 1000
MIN_POINTS = 200
WRONG_SCORE = 0

# Bonus points for speed ranking among correct answers
POSITION_BONUSES = {
    1: 50,  # 1st correct answer bonus
    2: 25,  # 2nd correct answer bonus
}


def calculate_points(
    position: int = 1,
    time_taken_seconds: float = 0.0,
    total_duration_seconds: float = 15.0,
    is_correct: bool = True,
) -> int:
    """Calculate points using a time-decay formula.

    Args:
        position: 1-indexed rank among correct answers (1 = fastest).
        time_taken_seconds: Elapsed seconds from round start to submission.
        total_duration_seconds: Total clip duration in seconds.
        is_correct: Whether the submitted answer was correct.

    Returns:
        Points awarded (0 for incorrect, up to 1000 for correct).
    """
    if not is_correct or position <= 0:
        return WRONG_SCORE

    total_duration = max(1.0, float(total_duration_seconds))
    time_taken = max(0.0, min(float(time_taken_seconds), total_duration))

    # Calculate remaining time ratio [1.0 -> instant, 0.0 -> buzzer]
    time_ratio = (total_duration - time_taken) / total_duration

    # Linear time-decay calculation
    decay_range = MAX_POINTS - MIN_POINTS
    decay_points = round(MIN_POINTS + (decay_range * time_ratio))

    # Speed rank bonus
    bonus = POSITION_BONUSES.get(position, 0)

    # Final score clamped between MIN_POINTS and MAX_POINTS
    final_points = min(MAX_POINTS, max(MIN_POINTS, decay_points + bonus))
    return int(final_points)
