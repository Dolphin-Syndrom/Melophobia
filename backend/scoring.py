"""Scoring calculation for Melophobia."""

POSITION_SCORES = {
    1: 1000,
    2: 750,
    3: 500,
}
DEFAULT_CORRECT_SCORE = 250
WRONG_SCORE = 0


def calculate_points(position: int) -> int:
    """Calculate points based on answer position (1-indexed).

    Args:
        position: The position among correct answers (1 = first correct).

    Returns:
        Points awarded.
    """
    if position <= 0:
        return WRONG_SCORE
    return POSITION_SCORES.get(position, DEFAULT_CORRECT_SCORE)
