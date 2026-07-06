"""Unit tests for teacher_billing seat limits (no live server)."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

from teacher_billing import (
    PLANS,
    assert_teacher_can_add_student,
    count_teacher_seats,
    get_teacher_plan,
    register_teacher_seat,
)


def _mock_db(*, plan_doc=None, classroom_count=1):
    db = MagicMock()
    subs = MagicMock()
    classrooms = MagicMock()

    doc = plan_doc or {
        "teacher_id": "t1",
        "plan": "free",
        "seat_limit": 30,
        "classroom_limit": 1,
        "assigned_seats": [],
    }

    async def find_one(query, projection=None):
        return doc.copy()

    async def insert_one(doc_in):
        return MagicMock(inserted_id="new")

    async def update_one(*args, **kwargs):
        return MagicMock(modified_count=1)

    subs.find_one = AsyncMock(side_effect=find_one)
    subs.insert_one = AsyncMock(side_effect=insert_one)
    subs.update_one = AsyncMock(side_effect=update_one)
    db.teacher_subscriptions = subs

    classrooms.count_documents = AsyncMock(return_value=classroom_count)
    db.classrooms = classrooms
    return db, doc


@pytest.mark.asyncio
async def test_free_plan_defaults():
    db, _ = _mock_db(plan_doc=None)
    subs = db.teacher_subscriptions
    subs.find_one = AsyncMock(return_value=None)
    plan = await get_teacher_plan(db, "t_new")
    assert plan["plan"] == "free"
    subs.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_seat_limit_blocks_new_student():
    assigned = [{"student_owner_id": f"s{i}", "room_code": "ABC12"} for i in range(30)]
    db, _ = _mock_db(plan_doc={
        "teacher_id": "t1",
        "plan": "free",
        "seat_limit": 30,
        "classroom_limit": 1,
        "assigned_seats": assigned,
    })
    with pytest.raises(HTTPException) as exc:
        await assert_teacher_can_add_student(db, "t1", "ABC12", "new_student")
    assert exc.value.status_code == 402


@pytest.mark.asyncio
async def test_existing_student_allowed():
    db, _ = _mock_db(plan_doc={
        "teacher_id": "t1",
        "plan": "free",
        "seat_limit": 30,
        "classroom_limit": 1,
        "assigned_seats": [{"student_owner_id": "s1", "room_code": "ABC12"}],
    })
    await assert_teacher_can_add_student(db, "t1", "ABC12", "s1")


@pytest.mark.asyncio
async def test_count_unique_seats():
    db, _ = _mock_db(plan_doc={
        "teacher_id": "t1",
        "plan": "classroom",
        "seat_limit": 30,
        "classroom_limit": 1,
        "assigned_seats": [
            {"student_owner_id": "s1", "room_code": "A"},
            {"student_owner_id": "s1", "room_code": "B"},
            {"student_owner_id": "s2", "room_code": "A"},
        ],
    })
    n = await count_teacher_seats(db, "t1")
    assert n == 2


@pytest.mark.asyncio
async def test_school_plan_higher_limit():
    assert PLANS["school"]["seat_limit"] == 150
    assert PLANS["school"]["classroom_limit"] == 5
