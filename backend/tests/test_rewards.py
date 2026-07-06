"""Tests for rewards + G17 sentence grading."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rewards import COINS_PER_CORRECT, BADGE_CATALOG
from server import _grade_sentence_fallback


def test_coins_per_correct_constant():
    assert COINS_PER_CORRECT == 2


def test_grade_sentence_fallback_pass():
    r = _grade_sentence_fallback("陽光", "植物需要陽光才能生長。")
    assert r["passed"] is True
    assert r["score_pct"] >= 60


def test_grade_sentence_fallback_fail():
    r = _grade_sentence_fallback("陽光", "植物需要水。")
    assert r["passed"] is False


def test_badge_catalog_has_core_badges():
    ids = {b["badge_id"] for b in BADGE_CATALOG}
    assert "rookie" in ids
    assert "logic_master" in ids
    assert "legend" in ids
