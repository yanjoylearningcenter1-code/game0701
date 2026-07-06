"""Learning Journey step engine — reading + recitation tracks (Game Library v3)."""
from __future__ import annotations

import random
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from game_library import (
    GAME_LABELS,
    _,
    build_challenge,
    build_full_recall_challenge,
    build_paragraph_recall_challenge,
    build_passage_study_challenge,
    detect_language,
    pick_game_for_step,
)

READING_DICTATION_STEPS: Dict[int, dict] = {
    1: {"name": "Recognize", "name_zh": "認知", "game_options": ["G1", "G2", "G16", "G12"], "profile": "L", "pass_pct": 60, "lock_hours": 0, "continuous": True},
    2: {"name": "Understand", "name_zh": "理解", "game_options": ["G16", "G2", "G3", "G19", "G12"], "profile": "L", "pass_pct": 70, "lock_hours": 0, "continuous": True},
    3: {"name": "Start Spelling", "name_zh": "初階串字", "game_options": ["G16", "G18", "G20"], "profile": "L", "pass_pct": 75, "lock_hours": 0, "continuous": True},
    4: {"name": "Full Spelling", "name_zh": "完整串字", "game_options": ["G6", "G18", "G20"], "profile": "L", "pass_pct": 80, "lock_hours": 0, "continuous": True},
    5: {"name": "First Recall", "name_zh": "首次回想", "game_options": ["G18", "G9"], "profile": "R", "pass_pct": 65, "lock_hours": 0, "continuous": True},
    6: {"name": "Delayed Recall", "name_zh": "延遲回想", "game_options": ["G9"], "profile": "R", "pass_pct": 80, "lock_hours": 24, "continuous": False, "peek_disabled": True, "optional": True, "timed_mission": True, "time_limit_sec": 8},
    7: {"name": "Mixed Review", "name_zh": "混合複習", "game_options": ["G7", "G8", "G2", "G12"], "profile": "R", "pass_pct": 80, "lock_hours": 0, "continuous": True},
    8: {"name": "Fast Recall", "name_zh": "快速回想", "game_options": ["G8", "G7", "G9"], "profile": "R", "pass_pct": 85, "lock_hours": 0, "continuous": True, "time_limit_sec": 60},
    9: {"name": "Rehearsal Run", "name_zh": "衝線彩排", "game_options": ["G9", "G7", "G8"], "profile": "R", "pass_pct": 80, "lock_hours": 0, "continuous": True, "rehearsal": True},
    10: {"name": "Ready Check", "name_zh": "決賽閘", "game_options": ["G9"], "profile": "E", "pass_pct": 90, "lock_hours": 0, "continuous": True, "peek_disabled": True, "single_pass": True},
}

RECITATION_DICTATION_STEPS: Dict[int, dict] = {
    1: {"name": "Read & Understand", "name_zh": "閱讀理解", "game_options": ["READ"], "profile": "L", "pass_pct": 60, "lock_hours": 0, "continuous": True, "passage_study": True},
    2: {"name": "Highlight Keyword", "name_zh": "標記關鍵字", "game_options": ["HL", "G2"], "profile": "L", "pass_pct": 70, "lock_hours": 0, "continuous": True},
    3: {"name": "Missing Word", "name_zh": "填空缺字", "game_options": ["G5", "G13", "G18"], "profile": "L", "pass_pct": 75, "lock_hours": 0, "continuous": True},
    4: {"name": "Sentence Ordering", "name_zh": "句子重組", "game_options": ["G6"], "profile": "L", "pass_pct": 75, "lock_hours": 0, "continuous": True},
    5: {"name": "Sentence Recall", "name_zh": "單句默寫", "game_options": ["G9"], "profile": "R", "pass_pct": 80, "lock_hours": 0, "continuous": True, "listen_mode": "sentence"},
    6: {"name": "Paragraph Recall", "name_zh": "段落默寫", "game_options": ["G9"], "profile": "R", "pass_pct": 80, "lock_hours": 0, "continuous": True, "paragraph_mode": True},
    7: {"name": "Delayed Recall ①", "name_zh": "延遲回想①", "game_options": ["G9"], "profile": "R", "pass_pct": 85, "lock_hours": 24, "continuous": False, "peek_disabled": True},
    8: {"name": "Delayed Recall ②", "name_zh": "延遲回想②", "game_options": ["G9"], "profile": "R", "pass_pct": 85, "lock_hours": 48, "continuous": False, "peek_disabled": True},
    9: {"name": "Delayed Recall ③", "name_zh": "延遲回想③", "game_options": ["G9"], "profile": "R", "pass_pct": 88, "lock_hours": 72, "continuous": False, "peek_disabled": True},
    10: {"name": "Full Dictation", "name_zh": "全文默", "game_options": ["G9"], "profile": "E", "pass_pct": 90, "lock_hours": 0, "continuous": True, "peek_disabled": True, "full_passage": True, "single_pass": True},
}

# All playable game ids for weak-topic / exam learn steps
ALL_JOURNEY_GAMES = [
    "G1", "G2", "G3", "G4", "G6", "G7", "G8", "G9", "G10", "G11",
    "G12", "G13", "G16", "G17", "G18", "G19", "G20",
]

QUIZ_STEPS: Dict[int, dict] = {
    1: {"name": "Know", "name_zh": "概念認知", "game_options": ["READ", "G16", "G2"], "profile": "L", "pass_pct": 60, "lock_hours": 0, "continuous": True},
    2: {"name": "Understand Match", "name_zh": "理解-配對", "game_options": ["G2", "G19"], "profile": "L", "pass_pct": 70, "lock_hours": 0, "continuous": True},
    3: {"name": "Understand Examples", "name_zh": "理解-例子", "game_options": ["G3", "G12"], "profile": "L", "pass_pct": 70, "lock_hours": 0, "continuous": True},
    4: {"name": "Apply MC Basic", "name_zh": "應用-基礎MC", "game_options": ["G3", "G11"], "profile": "L", "pass_pct": 75, "lock_hours": 0, "continuous": True},
    5: {"name": "Apply Mixed MC", "name_zh": "應用-混合MC", "game_options": ["G3", "G11", "G2"], "profile": "R", "pass_pct": 75, "lock_hours": 0, "continuous": True},
    6: {"name": "Apply Scenario", "name_zh": "應用-情境題", "game_options": ["G11", "G17"], "profile": "R", "pass_pct": 80, "lock_hours": 0, "continuous": True},
    7: {"name": "Weak Topic Drill", "name_zh": "弱項操練", "game_options": ALL_JOURNEY_GAMES, "profile": "L", "pass_pct": 80, "lock_hours": 0, "continuous": True, "prefer_weak": True},
    8: {"name": "Timed Round", "name_zh": "限時回合", "game_options": ["G7", "G8"], "profile": "R", "pass_pct": 85, "lock_hours": 0, "continuous": True, "time_limit_sec": 8},
    9: {"name": "Mock Quiz", "name_zh": "模擬測驗", "game_options": ["G3", "G9", "G11"], "profile": "E", "pass_pct": 85, "lock_hours": 0, "continuous": True, "peek_disabled": True, "mixed_mock": True},
    10: {"name": "Delayed Confirm", "name_zh": "延遲確認", "game_options": ["G9"], "profile": "R", "pass_pct": 85, "lock_hours": 48, "lock_hours_min": 48, "lock_hours_max": 72, "continuous": False, "peek_disabled": True},
    11: {"name": "Final Confirm", "name_zh": "最終確認", "game_options": ["G3", "G9", "G11", "G2"], "profile": "E", "pass_pct": 90, "lock_hours": 0, "continuous": True, "peek_disabled": True, "final_sample": True},
}

EXAM_STEPS: Dict[int, dict] = {
    1: {"name": "Learn", "name_zh": "學習", "game_options": ALL_JOURNEY_GAMES, "profile": "L", "pass_pct": 75, "lock_hours": 0, "continuous": True},
    2: {"name": "Topic Review", "name_zh": "單科回顧", "game_options": ["G2", "G9"], "profile": "R", "pass_pct": 80, "lock_hours": 0, "continuous": True},
    3: {"name": "Cross-topic Review", "name_zh": "跨科回顧", "game_options": ["G2", "G9"], "profile": "R", "pass_pct": 80, "lock_hours": 0, "continuous": True, "cross_topic": True},
    4: {"name": "Weak Diagnosis", "name_zh": "弱項診斷", "game_options": ["DIAG"], "profile": "L", "pass_pct": 0, "lock_hours": 0, "continuous": True, "diagnostic": True, "optional_pass": True},
    5: {"name": "Weak Boost", "name_zh": "弱項強化", "game_options": ALL_JOURNEY_GAMES, "profile": "L", "pass_pct": 80, "lock_hours": 0, "continuous": True, "prefer_weak": True},
    6: {"name": "Timed Mixed", "name_zh": "限時混合", "game_options": ["G7", "G8"], "profile": "R", "pass_pct": 85, "lock_hours": 0, "continuous": True, "time_limit_sec": 8},
    7: {"name": "Past Paper ①", "name_zh": "Past Paper①", "game_options": ALL_JOURNEY_GAMES, "profile": "R", "pass_pct": 0, "lock_hours": 0, "continuous": True, "past_paper": True, "optional_pass": True},
    8: {"name": "Error Review", "name_zh": "錯題複習", "game_options": ["G10"], "profile": "R", "pass_pct": 85, "lock_hours": 0, "continuous": True, "error_review": True},
    9: {"name": "Past Paper ②", "name_zh": "Past Paper②", "game_options": ALL_JOURNEY_GAMES, "profile": "E", "pass_pct": 85, "lock_hours": 0, "continuous": True, "past_paper": True, "timed_paper": True, "peek_disabled": True},
    10: {"name": "Final Sprint", "name_zh": "最後衝刺", "game_options": ALL_JOURNEY_GAMES, "profile": "R", "pass_pct": 90, "lock_hours": 0, "continuous": True, "prefer_weak": True},
    11: {"name": "Confidence Check", "name_zh": "信心確認", "game_options": ALL_JOURNEY_GAMES, "profile": "E", "pass_pct": 0, "lock_hours": 0, "continuous": True, "final_sample": True, "optional_pass": True},
}

TRACK_STEP_TABLES: Dict[str, Dict[int, dict]] = {
    "reading_dictation": READING_DICTATION_STEPS,
    "recital_dictation": RECITATION_DICTATION_STEPS,
    "quiz": QUIZ_STEPS,
    "exam": EXAM_STEPS,
}

TRACK_LABELS = {
    "reading_dictation": {"title": "📖 讀默 Journey", "default_name": "Reading dictation"},
    "recital_dictation": {"title": "🗡️ 背默 Journey", "default_name": "Recitation dictation"},
    "quiz": {"title": "⚡ 測驗 Journey", "default_name": "Quiz"},
    "exam": {"title": "🏆 考試 Journey", "default_name": "Exam"},
}

# Each journey step plays ~1.5× the base unit count (cycles weak/extra reps).
JOURNEY_QUESTION_MULTIPLIER = 1.5
BOSS_HP_PER_QUESTION = 18


def expand_step_questions(challenges: List[dict], factor: float = JOURNEY_QUESTION_MULTIPLIER) -> List[dict]:
    """Pad a step deck to round(n × factor) by cycling challenges (min 2 base items)."""
    n = len(challenges)
    if n < 2:
        return challenges
    target = max(n, round(n * factor))
    if target <= n:
        return challenges
    out = [dict(c) for c in challenges]
    i = 0
    while len(out) < target:
        out.append(dict(challenges[i % n]))
        i += 1
    return out


def boss_max_hp_for_questions(n: int) -> int:
    return max(120, round(n * BOSS_HP_PER_QUESTION))


def get_step_table(track_type: str) -> Dict[int, dict]:
    return TRACK_STEP_TABLES.get(track_type, READING_DICTATION_STEPS)


def max_step_for_track(track_type: str) -> int:
    return max(get_step_table(track_type).keys())


# Visual theme ids — mapped to frontend stepThemes.js
STEP_THEME_META: Dict[str, Dict[int, dict]] = {
    "reading_dictation": {
        1: {"theme_id": "meadow", "tagline_zh": "泡泡認字，輕鬆開始", "tagline_en": "Bubble pop — easy start"},
        2: {"theme_id": "library", "tagline_zh": "理解詞意，配對出擊", "tagline_en": "Match meanings"},
        3: {"theme_id": "forge", "tagline_zh": "初階串字，動手砌詞", "tagline_en": "Build the letters"},
        4: {"theme_id": "forge", "tagline_zh": "完整串字，字形大師", "tagline_en": "Full spelling forge"},
        5: {"theme_id": "echo", "tagline_zh": "首次回想，聽音寫字", "tagline_en": "First echo recall"},
        6: {"theme_id": "bonus", "tagline_zh": "額外挑戰 — 限時種子", "tagline_en": "Bonus timed seed"},
        7: {"theme_id": "arena", "tagline_zh": "混合競技場，全面複習", "tagline_en": "Mixed arena review"},
        8: {"theme_id": "sprint", "tagline_zh": "極速衝刺，限時開考", "tagline_en": "Speed sprint"},
        9: {"theme_id": "rehearsal", "tagline_zh": "衝線彩排 — 試下先，唔使緊張", "tagline_en": "Rehearsal — no pressure"},
        10: {"theme_id": "finale", "tagline_zh": "決賽閘 — 全部詞語，一次過", "tagline_en": "Final gate — all words once"},
    },
    "recital_dictation": {
        1: {"theme_id": "scroll", "tagline_zh": "閱讀理解，進入故事", "tagline_en": "Read and understand"},
        2: {"theme_id": "library", "tagline_zh": "標記關鍵字", "tagline_en": "Highlight keywords"},
        3: {"theme_id": "forge", "tagline_zh": "填補空缺", "tagline_en": "Fill the gaps"},
        4: {"theme_id": "forge", "tagline_zh": "句子重組", "tagline_en": "Reorder sentences"},
        5: {"theme_id": "echo", "tagline_zh": "單句默寫", "tagline_en": "Sentence recall"},
        6: {"theme_id": "echo", "tagline_zh": "段落默寫", "tagline_en": "Paragraph recall"},
        7: {"theme_id": "bonus", "tagline_zh": "延遲回想 ①", "tagline_en": "Delayed recall I"},
        8: {"theme_id": "bonus", "tagline_zh": "延遲回想 ②", "tagline_en": "Delayed recall II"},
        9: {"theme_id": "bonus", "tagline_zh": "延遲回想 ③", "tagline_en": "Delayed recall III"},
        10: {"theme_id": "finale", "tagline_zh": "全文默 — 決賽閘", "tagline_en": "Full passage finale"},
    },
}


def get_step_theme(track_type: str, step: int, cfg: Optional[dict] = None) -> dict:
    cfg = cfg or get_step_table(track_type).get(step, {})
    table = STEP_THEME_META.get(track_type, STEP_THEME_META["reading_dictation"])
    meta = dict(table.get(step, table.get(1, {})))
    if cfg.get("optional"):
        meta = {**STEP_THEME_META["reading_dictation"][6], **meta, "theme_id": "bonus"}
    if cfg.get("rehearsal"):
        meta["theme_id"] = "rehearsal"
    if cfg.get("single_pass"):
        meta["theme_id"] = "finale"
    if cfg.get("timed_mission"):
        meta["tagline_zh"] = f"⏱ {meta.get('tagline_zh', '')}"
    return meta


def shrink_step_questions(challenges: List[dict], factor: float = 0.9) -> List[dict]:
    """Trim deck to round(n × factor) — used for early steps with fewer reps."""
    n = len(challenges)
    if n <= 1:
        return challenges
    target = max(1, round(n * factor))
    if target >= n:
        return challenges
    shuffled = _shuffle(list(challenges))
    return [dict(c) for c in shuffled[:target]]


def step_profile(step: int, track_type: str = "reading_dictation") -> str:
    return get_step_table(track_type).get(step, {}).get("profile", "L")


def split_into_bundles(units: List[dict], max_per: int = 10) -> List[List[dict]]:
    n = len(units)
    if n <= 12:
        return [units]
    if n <= 24:
        mid = (n + 1) // 2
        return [units[:mid], units[mid:]]
    third = -(-n // 3)
    return [units[i : i + third] for i in range(0, n, third)]


def assign_bundle_indices(units: List[dict]) -> List[dict]:
    bundles = split_into_bundles(units)
    out = []
    for bi, chunk in enumerate(bundles):
        for u in chunk:
            tagged = {**u, "bundle_index": bi}
            if not tagged.get("language"):
                tagged["language"] = detect_language(tagged.get("term", ""))
            if not tagged.get("unit_type"):
                tagged["unit_type"] = "sentence" if len(tagged.get("term", "")) > 30 else "word"
            out.append(tagged)
    return out


def units_for_bundle(units: List[dict], bundle_index: int) -> List[dict]:
    tagged = [u for u in units if u.get("bundle_index", 0) == bundle_index]
    if tagged:
        return tagged
    if bundle_index == 0:
        return units[:12] if len(units) > 12 else units
    return []


def bundle_count_for_units(units: List[dict]) -> int:
    if not units:
        return 1
    indices = {u.get("bundle_index", 0) for u in units}
    if len(indices) > 1 or any("bundle_index" in u for u in units):
        return max(indices) + 1
    return 1 if len(units) <= 12 else len(split_into_bundles(units))


def _shuffle(items: list) -> list:
    a = list(items)
    random.shuffle(a)
    return a


def weak_units_first(units: List[dict]) -> List[dict]:
    weak = [u for u in units if u.get("long_term_weak")]
    return weak + [u for u in units if not u.get("long_term_weak")] if weak else units


def build_diagnostic_challenge(units: List[dict], step: int) -> dict:
    weak = [u for u in units if u.get("long_term_weak")]
    if not weak:
        weak = sorted(units, key=lambda u: u.get("review_count") or 0)[: max(1, len(units) // 3)]
    terms = [u.get("term", "")[:80] for u in weak[:8]]
    lang = "zh" if any(detect_language(t) == "zh" for t in terms if t) else "en"
    return {
        "unit_id": weak[0].get("unit_id", "") if weak else "",
        "game_type": "DIAG",
        "step": step,
        "type": "diagnostic",
        "prompt": _("📊 弱項診斷 — 呢啲概念需要多練習", "📊 Weak spots — these concepts need more practice", lang),
        "weak_terms": terms,
        "answer": "ack",
        "auto_pass": True,
    }


def build_past_paper_challenges(
    units: List[dict],
    step: int,
    profile: str,
    performance: Optional[Dict[str, dict]],
    *,
    timed: bool = False,
    peek_disabled: bool = False,
) -> List[dict]:
    pool = weak_units_first(units)
    random.shuffle(pool)
    out = []
    for u in pool:
        g = pick_game_for_step(ALL_JOURNEY_GAMES, u, performance)
        c = build_challenge(
            g, u, units, step=step, profile=profile,
            peek_disabled=peek_disabled,
            time_limit_sec=12 if timed else None,
        )
        out.append(c)
    return out


def challenge_for_step(
    unit: dict,
    step: int,
    all_units: List[dict],
    *,
    track_type: str = "reading_dictation",
    game_id: Optional[str] = None,
    performance: Optional[Dict[str, dict]] = None,
) -> dict:
    table = get_step_table(track_type)
    cfg = table.get(step, table[1])
    options = cfg.get("game_options") or ["G3"]
    profile = cfg.get("profile", step_profile(step, track_type))
    peek_off = cfg.get("peek_disabled", False)
    time_lim = cfg.get("time_limit_sec")

    # Quiz mock: rotate G3/G9/G11 per unit
    if game_id:
        picked = game_id
    elif cfg.get("mixed_mock"):
        games = cfg.get("game_options") or ["G3", "G9", "G11"]
        uidx = next((i for i, x in enumerate(all_units) if x.get("unit_id") == unit.get("unit_id")), 0)
        picked = games[uidx % len(games)]
    else:
        picked = pick_game_for_step(options, unit, performance, step=step, track_type=track_type)

    if step == 8 and track_type in ("reading_dictation", "quiz", "exam") and picked == "G9":
        time_lim = time_lim or 60
    elif step == 8 and picked == "G8":
        time_lim = time_lim or 60
    elif track_type in ("quiz", "exam") and cfg.get("time_limit_sec"):
        time_lim = cfg.get("time_limit_sec")

    visual_recall = False

    u = dict(unit)
    if cfg.get("listen_mode"):
        u["listen_mode"] = cfg["listen_mode"]
    if track_type == "recital_dictation":
        u["unit_type"] = u.get("unit_type") or "sentence"
    elif track_type in ("quiz", "exam"):
        u["unit_type"] = u.get("unit_type") or "concept"

    return build_challenge(
        picked, u, all_units, step=step, profile=profile,
        peek_disabled=peek_off, time_limit_sec=time_lim,
        visual_recall=visual_recall,
    )


def generate_step_game(
    units: List[dict],
    step: int,
    track_title: str = "Reading Dictation",
    performance: Optional[Dict[str, dict]] = None,
    *,
    track_type: str = "reading_dictation",
    session_game_id: Optional[str] = None,
) -> dict:
    table = get_step_table(track_type)
    cfg = table.get(step, table[1])
    options = cfg.get("game_options") or ["G3"]
    profile = cfg.get("profile", step_profile(step, track_type))
    max_step = max_step_for_track(track_type)

    force_game = session_game_id
    if not force_game and len(options) == 1 and options[0] not in ("DIAG",):
        force_game = options[0]

    unit_list = weak_units_first(units) if cfg.get("prefer_weak") else units
    if cfg.get("cross_topic"):
        unit_list = _shuffle(list(units))

    if track_type == "recital_dictation" and step == 10 and cfg.get("full_passage"):
        challenges = [build_full_recall_challenge(units, step, profile)]
    elif track_type == "recital_dictation" and step == 1 and cfg.get("passage_study"):
        challenges = [build_passage_study_challenge(units, step, profile)]
    elif track_type == "recital_dictation" and step == 6 and cfg.get("paragraph_mode"):
        # One sentence at a time — avoid 40-word non-stop audio dump
        challenges = []
        for u in unit_list:
            sent = dict(u)
            sent["listen_mode"] = "sentence"
            c = build_challenge(
                "G9", sent, units, step=step, profile=profile,
                peek_disabled=False,
            )
            c["audio_only"] = True
            c["prompt"] = _(
                "🔊 聽一句，打一句",
                "🔊 Listen to one sentence, then type it",
                detect_language(sent.get("term", "")),
            )
            challenges.append(c)
    elif cfg.get("diagnostic"):
        challenges = [build_diagnostic_challenge(units, step)]
    elif cfg.get("past_paper"):
        challenges = build_past_paper_challenges(
            units, step, profile, performance,
            timed=cfg.get("timed_paper", False),
            peek_disabled=cfg.get("peek_disabled", False),
        )
    elif cfg.get("error_review"):
        weak_only = [u for u in units if u.get("long_term_weak")] or units
        challenges = [
            challenge_for_step(u, step, units, track_type=track_type, game_id="G10", performance=performance)
            for u in weak_only
        ]
    else:
        challenges = [
            challenge_for_step(u, step, units, track_type=track_type, game_id=force_game, performance=performance)
            for u in unit_list
        ]

    shuffle_steps = {7, 10, 11}
    if track_type == "quiz":
        shuffle_steps.add(11)
    if not cfg.get("single_pass"):
        if step in shuffle_steps and len(challenges) > 1:
            random.shuffle(challenges)
        if cfg.get("final_sample") and len(challenges) > 1:
            challenges = challenges[: max(1, int(len(challenges) * 0.8))]
        if track_type == "reading_dictation" and step >= 10 and len(challenges) > 1:
            challenges = challenges[: max(1, int(len(challenges) * 0.8))]

        if track_type == "reading_dictation" and step == 5:
            challenges = expand_step_questions(challenges, factor=2.0)
        elif track_type == "reading_dictation" and step in (1, 2):
            challenges = shrink_step_questions(challenges, factor=0.9)
        else:
            challenges = expand_step_questions(challenges)
    elif len(challenges) > 1:
        random.shuffle(challenges)

    games_used = sorted({c.get("game_type") for c in challenges})
    game_labels = [GAME_LABELS.get(g, {}).get("name_zh", g) for g in games_used]

    boss_names = {
        "reading_dictation": {
            1: "Bubble Sprite", 2: "Meaning Mimic", 3: "Letter Gremlin", 4: "Tile Troll",
            5: "Echo Wraith", 6: "Memory Seed", 7: "Chaos Mixer", 8: "Speed Demon",
            9: "Exam Phantom", 10: "Final Gatekeeper",
        },
        "recital_dictation": {
            1: "Story Keeper", 2: "Keyword Scout", 3: "Gap Guardian", 4: "Order Oracle",
            5: "Line Wraith", 6: "Paragraph Phantom", 7: "Time Seed I", 8: "Time Seed II",
            9: "Time Seed III", 10: "Full Scroll Dragon",
        },
        "quiz": {
            1: "Concept Sprite", 2: "Match Mimic", 3: "Example Gremlin", 4: "MC Troll",
            5: "Mix Wraith", 6: "Scenario Phantom", 7: "Drill Demon", 8: "Timer Beast",
            9: "Mock Dragon", 10: "Delay Seed", 11: "Quiz Gatekeeper",
        },
        "exam": {
            1: "Study Guide", 2: "Topic Sage", 3: "Cross Master", 4: "Diagnosis Owl",
            5: "Boost Knight", 6: "Speed Hawk", 7: "Paper I Guardian", 8: "Error Fixer",
            9: "Paper II Dragon", 10: "Sprint Champion", 11: "Confidence Star",
        },
    }
    names = boss_names.get(track_type, boss_names["reading_dictation"])

    pass_label = f"Pass ≥{cfg['pass_pct']}%" if cfg.get("pass_pct") else "Optional — no pass required"
    if cfg.get("optional_pass") and cfg.get("pass_pct", 0) > 0:
        pass_label = f"Suggested ≥{cfg['pass_pct']}% (optional)"

    intro = f"Step {step}/{max_step} · {cfg['name_zh']} · {pass_label}"
    if cfg.get("timed_mission"):
        intro = f"⏱ 限時任務 · {cfg['name_zh']} · {pass_label}"
    if cfg.get("optional"):
        intro = f"✨ 額外挑戰（可選）· {intro}"

    return {
        "title": f"{track_title} — Step {step}: {cfg['name']}",
        "boss_name": names.get(step, "Memory Boss"),
        "intro": intro,
        "challenges": challenges,
        "boss_max_hp": boss_max_hp_for_questions(len(challenges)),
        "journey_step": step,
        "journey_step_name": cfg.get("name"),
        "journey_step_name_zh": cfg.get("name_zh"),
        "pass_threshold_pct": cfg["pass_pct"],
        "audio_profile": profile,
        "peek_disabled": cfg.get("peek_disabled", False),
        "time_limit_sec": cfg.get("time_limit_sec"),
        "game_options": options,
        "games_used": games_used,
        "games_used_labels": game_labels,
        "track_type": track_type,
        "timed_mission": cfg.get("timed_mission", False),
        "optional_step": cfg.get("optional", False),
        "single_pass": bool(cfg.get("single_pass")),
        "rehearsal": bool(cfg.get("rehearsal")),
        "step_theme": get_step_theme(track_type, step, cfg),
    }


def parse_step_completed_at(raw: Any) -> Dict[int, datetime]:
    out: Dict[int, datetime] = {}
    if not isinstance(raw, dict):
        return out
    for k, v in raw.items():
        try:
            step = int(k)
            if isinstance(v, datetime):
                out[step] = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
            elif isinstance(v, str):
                dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
                out[step] = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
    return out


def step_lock_status(track: dict, step: int, now: Optional[datetime] = None) -> dict:
    track_type = track.get("track_type", "reading_dictation")
    table = get_step_table(track_type)
    now = now or datetime.now(timezone.utc)
    current = int(track.get("current_step") or 1)
    cfg = table.get(step, {})
    is_optional = cfg.get("optional", False)
    lock_hours = (track.get("step_lock_hours") or {}).get(str(step))
    if lock_hours is None:
        lock_hours = cfg.get("lock_hours", 0)

    if step > current:
        return {"unlocked": False, "reason": "not_reached", "current_step": current}

    completed = parse_step_completed_at(track.get("step_completed_at"))
    if step in completed:
        return {"unlocked": True, "replay": True, "current_step": current}

    if step < current and not is_optional:
        return {"unlocked": True, "replay": True, "current_step": current}

    if lock_hours <= 0:
        return {"unlocked": True, "current_step": current, "optional": is_optional}

    prev_at = completed.get(step - 1)
    if not prev_at:
        return {"unlocked": True, "current_step": current, "optional": is_optional}

    unlock_at = prev_at + timedelta(hours=lock_hours)
    if now >= unlock_at:
        return {"unlocked": True, "current_step": current, "optional": is_optional}

    remaining = unlock_at - now
    hours_left = max(0, int(remaining.total_seconds() // 3600))
    mins_left = max(0, int((remaining.total_seconds() % 3600) // 60))
    bonus = "額外限時任務" if is_optional else "記憶種子"
    return {
        "unlocked": False,
        "reason": "time_lock",
        "unlock_at": unlock_at.isoformat(),
        "hours_left": hours_left,
        "minutes_left": mins_left,
        "message": f"⏰ {bonus}仲未解鎖 — 仲有 {hours_left} 小時 {mins_left} 分鐘",
        "current_step": current,
        "optional": is_optional,
    }


def journey_status(track: dict, now: Optional[datetime] = None) -> dict:
    track_type = track.get("track_type", "reading_dictation")
    table = get_step_table(track_type)
    now = now or datetime.now(timezone.utc)
    current = int(track.get("current_step") or 1)
    steps = []
    for n, cfg in table.items():
        lock = step_lock_status(track, n, now)
        opts = cfg.get("game_options") or []
        opt_labels = [GAME_LABELS.get(g, {}).get("name_zh", g) for g in opts]
        eff_lock = (track.get("step_lock_hours") or {}).get(str(n))
        if eff_lock is None:
            eff_lock = cfg.get("lock_hours", 0)
        completed = parse_step_completed_at(track.get("step_completed_at"))
        if n in completed:
            st = "done"
        elif n == current:
            st = "active"
        elif cfg.get("optional"):
            st = "bonus" if lock.get("unlocked") else "bonus_waiting"
        elif n < current:
            st = "done"
        else:
            st = "upcoming"
        steps.append({
            "step": n,
            "name": cfg["name"],
            "name_zh": cfg["name_zh"],
            "game_options": opts,
            "game_options_labels": opt_labels,
            "profile": cfg.get("profile", "L"),
            "pass_pct": cfg["pass_pct"],
            "optional": cfg.get("optional", False),
            "timed_mission": cfg.get("timed_mission", False),
            "optional_pass": cfg.get("optional_pass", False),
            "status": st,
            "unlocked": lock.get("unlocked", False) if n == current else n <= current,
            "lock": lock if n == current and not lock.get("unlocked") else None,
            "continuous": cfg.get("continuous", True),
            "lock_hours": eff_lock,
            "lock_hours_range": [cfg.get("lock_hours_min"), cfg.get("lock_hours_max")]
            if cfg.get("lock_hours_min") and cfg.get("lock_hours_max") else None,
            "rehearsal": cfg.get("rehearsal", False),
            "single_pass": cfg.get("single_pass", False),
            "step_theme": get_step_theme(track_type, n, cfg),
        })
    return {
        "track_id": track.get("track_id"),
        "track_type": track_type,
        "current_step": current,
        "max_step": max_step_for_track(track_type),
        "current_bundle_index": int(track.get("current_bundle_index") or 0),
        "bundle_count": int(track.get("bundle_count") or 1),
        "steps": steps,
        "step_completed_at": track.get("step_completed_at") or {},
        "track_status": track.get("status", "active"),
    }


def _step_was_completed(completed: dict, step: int) -> bool:
    return step in completed or str(step) in completed


def step_back_on_fail(step: int, correct: int, total: int, track_type: str = "reading_dictation") -> Optional[int]:
    if total <= 0:
        return None
    pct = (correct / total) * 100
    if track_type in ("reading_dictation", "recital_dictation") and step == 10:
        return None
    if track_type == "quiz" and step == 11:
        return None if pct >= 90 else 7
    return None


def score_meets_step_threshold(correct: int, total: int, step: int, track_type: str = "reading_dictation") -> bool:
    cfg = get_step_table(track_type).get(step, {})
    if cfg.get("optional_pass"):
        return True
    if total <= 0:
        return False
    pct = (correct / total) * 100
    threshold = cfg.get("pass_pct", 60)
    return pct >= threshold


def next_step_after_pass(step: int, track_type: str = "reading_dictation") -> int:
    # Step 6 is optional delayed recall — main path jumps to step 7 after step 5.
    if track_type == "reading_dictation" and step == 5:
        return min(7, max_step_for_track(track_type))
    return min(step + 1, max_step_for_track(track_type))
