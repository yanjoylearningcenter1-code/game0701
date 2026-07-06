"""SEN behavioral signal collection — non-diagnostic (v3 §9)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

CONSENT_TYPE = "behavioral_signals"


async def has_behavioral_consent(db, student_id: str) -> bool:
    doc = await db.consent_records.find_one(
        {"kid_owner_id": student_id, "consent_type": CONSENT_TYPE, "granted": True},
        {"_id": 0},
    )
    return doc is not None


def infer_error_pattern_tag(
    *,
    game_type: Optional[str],
    correct: bool,
    reaction_time_ms: Optional[int],
    hint_usage: int,
    replay_count: int,
) -> Optional[str]:
    if correct:
        return None
    if game_type in ("G9", "typing") and replay_count >= 2:
        return "audio_replay_heavy"
    if game_type in ("G9", "typing") and (reaction_time_ms or 0) > 8000:
        return "slow_audio_response"
    if game_type in ("G12", "G4", "G4-zh") and hint_usage == 0:
        return "similar_form_confusion"
    if game_type in ("G7", "G8") and (reaction_time_ms or 0) > 6000:
        return "timed_game_slow"
    if hint_usage >= 2:
        return "frequent_hint_use"
    return "general_incorrect"


async def record_behavioral_signal(
    db,
    student_id: str,
    *,
    unit_id: Optional[str] = None,
    track_id: Optional[str] = None,
    game_type: Optional[str] = None,
    reaction_time_ms: Optional[int] = None,
    processing_time_ms: Optional[int] = None,
    replay_count: int = 0,
    hint_usage: int = 0,
    correct: Optional[bool] = None,
    error_pattern_tag: Optional[str] = None,
) -> Optional[dict]:
    if not await has_behavioral_consent(db, student_id):
        return None
    if error_pattern_tag is None and correct is False:
        error_pattern_tag = infer_error_pattern_tag(
            game_type=game_type,
            correct=False,
            reaction_time_ms=reaction_time_ms,
            hint_usage=hint_usage,
            replay_count=replay_count,
        )
    doc = {
        "student_id": student_id,
        "unit_id": unit_id,
        "track_id": track_id,
        "game_type": game_type,
        "reaction_time_ms": reaction_time_ms,
        "processing_time_ms": processing_time_ms,
        "replay_count": replay_count,
        "hint_usage": hint_usage,
        "correct": correct,
        "error_pattern_tag": error_pattern_tag,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.behavioral_signals.insert_one(doc)
    return doc


PATTERN_LABELS = {
    "audio_replay_heavy": "聽寫題目時較常重播音效",
    "slow_audio_response": "聽寫類題目反應時間較長",
    "similar_form_confusion": "形似字/部件題目較易出錯",
    "timed_game_slow": "限時遊戲反應較慢",
    "frequent_hint_use": "較常使用提示",
    "general_incorrect": "答題模式觀察（非診斷）",
}


async def summarize_for_parent(db, student_id: str, limit: int = 200) -> dict:
    """Gentle pattern summary for Parent/Teacher only (§9.3)."""
    if not await has_behavioral_consent(db, student_id):
        return {"consent_required": True, "observations": [], "disclaimer": _DISCLAIMER}

    signals = await db.behavioral_signals.find(
        {"student_id": student_id}, {"_id": 0}
    ).sort("recorded_at", -1).to_list(limit)

    if not signals:
        return {"consent_required": False, "observations": [], "disclaimer": _DISCLAIMER}

    by_game: dict = {}
    for s in signals:
        gt = s.get("game_type") or "unknown"
        bucket = by_game.setdefault(gt, {"count": 0, "reaction_sum": 0, "hint_sum": 0, "replay_sum": 0, "patterns": {}})
        bucket["count"] += 1
        bucket["reaction_sum"] += int(s.get("reaction_time_ms") or 0)
        bucket["hint_sum"] += int(s.get("hint_usage") or 0)
        bucket["replay_sum"] += int(s.get("replay_count") or 0)
        tag = s.get("error_pattern_tag")
        if tag:
            bucket["patterns"][tag] = bucket["patterns"].get(tag, 0) + 1

    observations = []
    for gt, b in by_game.items():
        avg_reaction = round(b["reaction_sum"] / b["count"]) if b["count"] else 0
        top_pattern = max(b["patterns"].items(), key=lambda x: x[1])[0] if b["patterns"] else None
        label = PATTERN_LABELS.get(top_pattern, top_pattern) if top_pattern else None
        observations.append({
            "game_type": gt,
            "sample_count": b["count"],
            "avg_reaction_time_ms": avg_reaction,
            "avg_hint_usage": round(b["hint_sum"] / b["count"], 1) if b["count"] else 0,
            "avg_replay_count": round(b["replay_sum"] / b["count"], 1) if b["count"] else 0,
            "pattern_note": label,
        })

    return {"consent_required": False, "observations": observations, "disclaimer": _DISCLAIMER}


_DISCLAIMER = (
    "以下為學習模式觀察，僅供參考，非診斷。"
    "如你亦留意到類似情況，可考慮同學校或專業人士傾談。"
)
