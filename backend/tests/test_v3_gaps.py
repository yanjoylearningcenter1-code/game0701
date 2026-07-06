"""Tests for quiz step 10 variable lock + G9 visual recall."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import datetime, timezone, timedelta
from game_library import build_challenge
from journey_engine import QUIZ_STEPS, step_lock_status


def test_quiz_step10_has_lock_range():
    cfg = QUIZ_STEPS[10]
    assert cfg.get("lock_hours_min") == 48
    assert cfg.get("lock_hours_max") == 72


def test_step_lock_uses_track_override():
    prev = datetime.now(timezone.utc) - timedelta(hours=10)
    track = {
        "track_type": "quiz",
        "current_step": 10,
        "step_completed_at": {"9": prev.isoformat()},
        "step_lock_hours": {"10": 60},
    }
    lock = step_lock_status(track, 10)
    assert lock["unlocked"] is False
    assert lock["reason"] == "time_lock"


def test_g9_visual_recall_step5():
    unit = {"term": "elephant", "meaning": "a large grey animal", "unit_id": "ku1"}
    c = build_challenge("G9", unit, [unit], step=5, profile="R", visual_recall=True)
    assert c.get("visual_hint") is True
    assert c.get("visual_cue") == "a large grey animal"
    assert c.get("audio_only") is False
