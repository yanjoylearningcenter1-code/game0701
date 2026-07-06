"""Tests for key concept extraction (v3 §7.1)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from key_concepts import (
    concepts_to_knowledge_units,
    key_concepts_fallback,
    language_split_stats,
    detect_token_language,
    _split_bloated_concepts,
)


def test_language_split_mixed():
    stats = language_split_stats("中文詞語 elephant photosynthesis")
    assert stats["zh_count"] >= 1
    assert stats["en_count"] >= 2
    assert stats["mixed"] is True


def test_detect_token_language():
    assert detect_token_language("光合作用") == "zh"
    assert detect_token_language("elephant") == "en"


def test_fallback_finds_definition_pattern():
    text = "光合作用係指植物利用陽光將二氧化碳轉化為養分的過程。"
    concepts = key_concepts_fallback(text, "quiz")
    assert len(concepts) >= 1
    assert any("光合作用" in c["exact_term"] for c in concepts)


def test_reading_dictation_splits_unspaced_cjk_word_list():
    """Regression: a kid typing a 8-char word list with no spaces (e.g. from
    a worksheet) must split into individual 2-char words, not become one
    giant 8-character "concept" — the exact bug that made Journey Step 1
    generate only a single challenge instead of one per word."""
    concepts = key_concepts_fallback("你好門口地區好像", "reading_dictation")
    terms = [c["exact_term"] for c in concepts]
    assert terms == ["你好", "門口", "地區", "好像"]


def test_reading_dictation_splits_delimited_word_list():
    concepts = key_concepts_fallback("apple\nbanana\norange", "reading_dictation")
    terms = {c["exact_term"] for c in concepts}
    assert terms == {"apple", "banana", "orange"}


def test_reading_dictation_splits_single_space_word_list():
    concepts = key_concepts_fallback("cat dog bird fish", "reading_dictation")
    terms = {c["exact_term"] for c in concepts}
    assert terms == {"cat", "dog", "bird", "fish"}


def test_split_bloated_concept_with_bracket_heading():
    """Regression: a peek hint / challenge answer must never reveal a whole
    '【好詞】idiom idiom idiom' blob instead of a single word."""
    concepts = [{
        "concept_id": "kc_1",
        "exact_term": "【好詞】喜笑顏開 興高采烈 手舞足蹈",
        "simplified_explanation": None,
        "language": "zh",
        "presentation": "flashcard",
        "context_snippet": None,
    }]
    split = _split_bloated_concepts(concepts)
    terms = [c["exact_term"] for c in split]
    assert terms == ["喜笑顏開", "興高采烈", "手舞足蹈"]


def test_split_bloated_concepts_leaves_normal_terms_alone():
    concepts = [{
        "concept_id": "kc_2",
        "exact_term": "光合作用",
        "simplified_explanation": "plants make food",
        "language": "zh",
        "presentation": "flashcard",
        "context_snippet": None,
    }]
    split = _split_bloated_concepts(concepts)
    assert len(split) == 1
    assert split[0]["exact_term"] == "光合作用"


def test_concepts_to_units_quiz():
    concepts = [{
        "concept_id": "kc_test",
        "exact_term": "Photosynthesis",
        "simplified_explanation": "plants make food",
        "language": "en",
        "presentation": "flashcard",
        "context_snippet": None,
    }]
    units = concepts_to_knowledge_units(concepts, "quiz")
    assert len(units) == 1
    assert units[0]["unit_type"] == "concept"
    assert units[0]["exact_term"] == "Photosynthesis"
    assert units[0]["key_concept_id"] == "kc_test"
