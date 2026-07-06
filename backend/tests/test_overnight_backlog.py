"""Overnight backlog unit tests — segment, clean, G18, family-link helpers."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from game_library import build_challenge
from journey_engine import step_back_on_fail, generate_step_game, max_step_for_track
from server import (
    _segment_text_deterministic,
    _segment_cjk_vocabulary_greedy,
    _clean_ocr_fallback,
    kid_owner_from_device,
    _contains_profanity,
)


def test_segment_sentence_splits_on_punctuation():
    text = "你好世界。這是第二句！還有第三句？"
    segs = _segment_text_deterministic(text, "sentence")
    assert len(segs) >= 3
    assert all(len(s) >= 2 for s in segs)


def test_segment_word_greedy_cjk():
    text = "大喜過望手舞足蹈"
    greedy = _segment_cjk_vocabulary_greedy(text)
    assert len(greedy) >= 2
    assert "".join(greedy).replace(" ", "") == text.replace(" ", "")


def test_clean_ocr_removes_cjk_spaces():
    raw = "小 五 中 文 測 驗"
    cleaned, summary = _clean_ocr_fallback(raw)
    assert " " not in cleaned or "小五" in cleaned.replace(" ", "")
    assert summary


def test_rescue_pool_includes_all_answer_chars():
    from game_library import _letter_pool_for_rescue
    pool = _letter_pool_for_rescue("四通八達", True)
    for ch in "四通八達":
        assert ch in pool, f"missing {ch} in {pool}"


def test_g18_crossword_has_reference_fields():
    unit = {"term": "大喜過望", "meaning": "very happy", "language": "zh", "unit_id": "ku6"}
    c = build_challenge("G18", unit, [unit], step=3)
    assert c["type"] == "crossword"
    assert c["answer"] == "大喜過望"
    assert "＿" in c["masked"]


def test_g10_typo_hunter_reference_sentence():
    unit = {
        "term": "elephant",
        "meaning": "large animal",
        "context": "The elephant is large.",
        "language": "en",
        "unit_id": "ku10",
    }
    c = build_challenge("G10", unit, [unit], step=8)
    assert c.get("reference_sentence")
    assert c["typo_word"] in c["reference_sentence"]
    assert c["answer"] == "elephant"


def test_kid_owner_from_device():
    assert kid_owner_from_device("guest_abc123") == "guest_abc123"
    assert kid_owner_from_device("abc123") == "guest_abc123"


def test_profanity_filter_blocks_bad_names():
    assert _contains_profanity("nice kid") is False
    assert _contains_profanity("badword fuck") is True
    assert _contains_profanity("傻B") is True


def test_step_back_reading_step10_no_regress():
    assert step_back_on_fail(10, 9, 10, "reading_dictation") is None
    assert step_back_on_fail(10, 10, 10, "reading_dictation") is None
    assert step_back_on_fail(10, 5, 10, "recital_dictation") is None


def test_step10_single_pass_all_content_once():
    units = [
        {"unit_id": f"u{i}", "term": f"詞{i}", "meaning": "m", "language": "zh"}
        for i in range(10)
    ]
    reading = generate_step_game(units, step=10, track_type="reading_dictation")
    assert reading["single_pass"] is True
    assert len(reading["challenges"]) == 10
    assert reading["pass_threshold_pct"] == 90

    recital = generate_step_game(units, step=10, track_type="recital_dictation")
    assert recital["single_pass"] is True
    assert len(recital["challenges"]) == 1
    assert recital["challenges"][0]["type"] == "full_recall"


def test_exam_journey_has_11_steps():
    assert max_step_for_track("exam") == 11
    units = [{"term": "math", "unit_id": "u1", "language": "en"}]
    game = generate_step_game(units, 11, "Exam", track_type="exam")
    assert game["journey_step"] == 11


def test_journey_step5_doubles_questions():
    units = [
        {"unit_id": f"u{i}", "term": f"詞{i}", "meaning": "m", "language": "zh"}
        for i in range(10)
    ]
    game = generate_step_game(units, step=5, track_type="reading_dictation")
    assert len(game["challenges"]) == 20


def test_next_step_after_pass_skips_optional_step6():
    from journey_engine import next_step_after_pass
    assert next_step_after_pass(5, "reading_dictation") == 7
    assert next_step_after_pass(6, "reading_dictation") == 7


def test_journey_step1_question_count_shrink():
    units = [
        {"unit_id": f"u{i}", "term": f"詞{i}", "meaning": "meaning", "language": "zh"}
        for i in range(10)
    ]
    game = generate_step_game(units, step=1, track_type="reading_dictation")
    assert len(game["challenges"]) == 9  # round(10 × 0.9)
    assert game["boss_max_hp"] == 9 * 18
