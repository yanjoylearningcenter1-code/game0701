"""Badge catalog + coin rewards (遊戲庫 v3 §第三部分)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

COINS_PER_CORRECT = 2

BADGE_CATALOG: List[dict] = [
    {"badge_id": "rookie", "name": "見習特工", "name_en": "Rookie Agent", "emoji": "⭐", "desc": "完成第一場戰鬥"},
    {"badge_id": "streak_7", "name": "七日特工", "name_en": "7-Day Agent", "emoji": "🔥", "desc": "連續7日學習"},
    {"badge_id": "combo_5", "name": "連擊高手", "name_en": "Combo Pro", "emoji": "⚡", "desc": "單場達成5連擊"},
    {"badge_id": "logic_master", "name": "邏輯大師", "name_en": "Logic Master", "emoji": "🧩", "desc": "G6拼字重組累計50次答對"},
    {"badge_id": "eagle_eye", "name": "鷹眼偵探", "name_en": "Eagle Eye", "emoji": "🔎", "desc": "G12文字探測器累計30次答對"},
    {"badge_id": "speed_demon", "name": "拆彈專家", "name_en": "Speed Demon", "emoji": "💣", "desc": "G8速讀累計30次答對"},
    {"badge_id": "legend", "name": "傳說特工", "name_en": "Legend Agent", "emoji": "🏆", "desc": "完成任一Track Journey"},
]


async def get_student_badges(db, student_id: str) -> List[dict]:
    docs = await db.student_badges.find({"student_id": student_id}, {"_id": 0}).to_list(50)
    owned = {d["badge_id"] for d in docs}
    out = []
    for b in BADGE_CATALOG:
        doc = next((d for d in docs if d["badge_id"] == b["badge_id"]), None)
        out.append({**b, "owned": b["badge_id"] in owned, "unlocked_at": doc.get("unlocked_at") if doc else None})
    return out


async def _game_type_totals(db, student_id: str) -> Dict[str, int]:
    perf = await db.game_mode_performance.find({"student_id": student_id}, {"_id": 0}).to_list(50)
    return {p["game_type"]: int(p.get("correct_count") or 0) for p in perf}


async def check_and_award_badges(
    db,
    student_id: str,
    *,
    session_count: int,
    streak: int,
    max_combo: int,
    track_completed: bool = False,
) -> List[str]:
    """Return list of newly unlocked badge_ids."""
    owned = {
        d["badge_id"]
        for d in await db.student_badges.find({"student_id": student_id}, {"_id": 0}).to_list(50)
    }
    totals = await _game_type_totals(db, student_id)
    now = datetime.now(timezone.utc).isoformat()
    candidates: List[tuple] = []

    if session_count >= 1:
        candidates.append("rookie")
    if streak >= 7:
        candidates.append("streak_7")
    if max_combo >= 5:
        candidates.append("combo_5")
    if totals.get("G6", 0) >= 50:
        candidates.append("logic_master")
    if totals.get("G12", 0) >= 30:
        candidates.append("eagle_eye")
    if totals.get("G8", 0) >= 30:
        candidates.append("speed_demon")
    if track_completed:
        candidates.append("legend")

    new_ids = []
    for bid in candidates:
        if bid in owned:
            continue
        await db.student_badges.insert_one({
            "student_id": student_id,
            "badge_id": bid,
            "unlocked_at": now,
            "owned": True,
        })
        new_ids.append(bid)
    return new_ids
