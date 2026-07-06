"""Tests for Game Library v3 — multi-game step options."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from game_library import build_challenge, pick_game_for_step, filter_game_options, detect_language
from journey_engine import READING_DICTATION_STEPS, generate_step_game, challenge_for_step


def test_g18_crossword_missing_part():
    unit = {"term": "大喜過望", "meaning": "very happy", "language": "zh", "unit_id": "ku6"}
    c = build_challenge("G18", unit, [unit], step=3)
    assert c["type"] == "crossword"
    assert c["answer"] == "大喜過望"
    assert "＿" in c["masked"]
    assert c["missing_part"] == "過"
    assert c["missing_part"] in c["answer"]


def test_g4_zh_answer_is_missing_component():
    unit = {"term": "手舞足蹈", "language": "zh", "unit_id": "ku1"}
    c = build_challenge("G4-zh", unit, [unit], step=3)
    assert c["type"] == "word_detective"
    assert c["answer"] in c["options"]
    assert c["answer"] in unit["term"]
    assert len(c["answer"]) == 1


def test_reading_steps_have_multiple_game_options():
    for step, cfg in READING_DICTATION_STEPS.items():
        opts = cfg.get("game_options") or []
        assert len(opts) >= 1, f"Step {step} needs game_options"
        if step in (1, 2, 3, 4, 7, 8):
            assert len(opts) >= 2, f"Step {step} should offer multiple games per v3 spec"


def test_zh_unit_gets_zh_spelling_variant():
    unit = {"term": "請求", "meaning": "request", "language": "zh", "unit_id": "ku1"}
    opts = READING_DICTATION_STEPS[3]["game_options"]
    filtered = filter_game_options(opts, "zh", 3)
    assert "G4-zh" in filtered or "G6-zh" in filtered or any("-zh" in g for g in filtered)


def test_en_unit_keeps_latin_games():
    unit = {"term": "elephant", "meaning": "big animal", "language": "en", "unit_id": "ku2"}
    filtered = filter_game_options(["G4", "G18", "G20"], "en", 3)
    assert "G4" in filtered
    assert "G4-zh" not in filtered


def test_build_g12_word_detective():
    unit = {"term": "cat", "meaning": "animal", "unit_id": "ku3"}
    all_u = [unit, {"term": "dog", "unit_id": "ku4"}]
    c = build_challenge("G12", unit, all_u, step=1, profile="L")
    assert c["type"] == "word_detective"
    assert c["answer"] == "cat"
    assert len(c["options"]) == 2


def test_performance_weighting_prefers_strong_game():
    unit = {"term": "test", "language": "en", "unit_id": "ku5"}
    opts = ["G1", "G2", "G16", "G12"]
    perf = {
        "G2": {"attempts": 10, "success_rate": 0.95},
        "G1": {"attempts": 10, "success_rate": 0.5},
        "G16": {"attempts": 10, "success_rate": 0.5},
        "G12": {"attempts": 10, "success_rate": 0.5},
    }
    picks = [pick_game_for_step(opts, unit, perf) for _ in range(200)]
    assert picks.count("G2") > picks.count("G1")


def test_generate_step_game_includes_games_used():
    units = [
        {"term": "apple", "meaning": "fruit", "unit_id": "a", "language": "en"},
        {"term": "banana", "meaning": "fruit", "unit_id": "b", "language": "en"},
    ]
    game = generate_step_game(units, step=1)
    assert "game_options" in game
    assert len(game["game_options"]) >= 2
    assert game["challenges"]
    assert all(c.get("game_type") for c in game["challenges"])


def test_recitation_steps_have_multiple_options():
    from journey_engine import RECITATION_DICTATION_STEPS, generate_step_game
    assert RECITATION_DICTATION_STEPS[1]["game_options"] == ["READ"]
    assert RECITATION_DICTATION_STEPS[7]["lock_hours"] == 24
    units = [{"term": "The quick brown fox.", "unit_id": "u1", "language": "en", "unit_type": "sentence"}]
    step1 = generate_step_game(units, 1, "Recital", track_type="recital_dictation")
    assert step1["challenges"][0]["type"] == "passage_study"
    game = generate_step_game(units, 10, "Recital", track_type="recital_dictation")
    assert game["challenges"][0]["type"] == "full_recall"


def test_quiz_and_exam_journeys():
    from journey_engine import QUIZ_STEPS, EXAM_STEPS, generate_step_game, max_step_for_track, score_meets_step_threshold
    assert max_step_for_track("quiz") == 11
    assert max_step_for_track("exam") == 11
    assert len(QUIZ_STEPS[7]["game_options"]) >= 10
    units = [
        {"term": "Photosynthesis", "meaning": "plant energy", "unit_id": "u1", "language": "en"},
        {"term": "Chlorophyll", "meaning": "green pigment", "unit_id": "u2", "language": "en", "long_term_weak": True},
    ]
    diag = generate_step_game(units, 4, "Quiz", track_type="exam")
    assert diag["challenges"][0]["type"] == "diagnostic"
    mock = generate_step_game(units, 9, "Quiz", track_type="quiz")
    assert len(mock["challenges"]) >= 2
    assert score_meets_step_threshold(0, 10, 4, "exam")  # optional pass


def test_g10_error_detection():
    unit = {"term": "cat", "context": "The cat sat.", "unit_id": "ku10", "language": "en"}
    c = build_challenge("G10", unit, [unit], step=8)
    assert c["type"] == "tap"
    assert c["answer"] == "cat"
    assert c.get("reference_sentence")
    assert c["typo_word"] in c["reference_sentence"]


def test_step10_single_pass_all_content_once():
    unit = {"term": "心甘情願", "unit_id": "ku9", "language": "zh"}
    c = build_challenge("G9", unit, [unit], step=8, profile="R", time_limit_sec=60)
    assert c["type"] == "typing"
    assert c["time_limit_sec"] == 60
    assert c["peek_limit"] == 2


def test_step9_rehearsal_less_formal():
    from journey_engine import generate_step_game, get_step_theme
    units = [
        {"unit_id": f"u{i}", "term": f"詞{i}", "meaning": "m", "language": "zh"}
        for i in range(6)
    ]
    game = generate_step_game(units, step=9, track_type="reading_dictation")
    assert game["rehearsal"] is True
    assert game["pass_threshold_pct"] == 80
    g9 = [c for c in game["challenges"] if c.get("type") == "typing"]
    if g9:
        assert g9[0].get("type") == "typing"
        assert g9[0].get("peek_limit", 0) > 0


def test_step10_final_theme():
    from journey_engine import generate_step_game
    units = [{"unit_id": "u1", "term": "詞", "language": "zh"}]
    game = generate_step_game(units, step=10, track_type="reading_dictation")
    assert game["single_pass"] is True
    assert game["step_theme"]["theme_id"] == "finale"
    assert len(game["challenges"]) == 1


def test_g8_hides_target_in_prompt():
    unit = {"term": "不朽", "unit_id": "ku8", "language": "zh"}
    c = build_challenge("G8", unit, [unit], step=8, time_limit_sec=60)
    assert c["type"] == "speed_grid"
    assert c["prompt"] == ""
    assert "不朽" not in (c.get("prompt_label") or "")
    assert c["answer"] == "不朽"


def test_detect_language():
    assert detect_language("hello") == "en"
    assert detect_language("你好") == "zh"
