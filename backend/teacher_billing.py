"""Teacher subscription plans + classroom seat limits."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

PLANS = {
    "free": {"label": "Free", "seat_limit": 30, "classroom_limit": 1, "price_label": "$0"},
    "classroom": {"label": "Classroom", "seat_limit": 30, "classroom_limit": 1, "price_label": "$9.99/mo"},
    "school": {"label": "School", "seat_limit": 150, "classroom_limit": 5, "price_label": "$39.99/mo"},
}


class SeatAssignRequest(BaseModel):
    room_code: str
    student_owner_id: str


class TeacherPlanUpdate(BaseModel):
    plan: str = Field(description="free | classroom | school")
    source: str = Field(default="manual", description="manual | iap | stripe")


def _plan_doc(teacher_id: str, plan: str = "free") -> dict:
    meta = PLANS.get(plan, PLANS["free"])
    now = datetime.now(timezone.utc).isoformat()
    return {
        "teacher_id": teacher_id,
        "plan": plan,
        "seat_limit": meta["seat_limit"],
        "classroom_limit": meta["classroom_limit"],
        "seats_used": 0,
        "assigned_seats": [],
        "updated_at": now,
        "source": "default",
    }


async def get_teacher_plan(db, teacher_id: str) -> dict:
    doc = await db.teacher_subscriptions.find_one({"teacher_id": teacher_id}, {"_id": 0})
    if not doc:
        doc = _plan_doc(teacher_id, "free")
        await db.teacher_subscriptions.insert_one({**doc})
    return doc


async def count_teacher_seats(db, teacher_id: str) -> int:
    plan = await get_teacher_plan(db, teacher_id)
    assigned = plan.get("assigned_seats") or []
    return len({a.get("student_owner_id") for a in assigned if a.get("student_owner_id")})


async def assert_teacher_can_add_student(db, teacher_id: str, room_code: str, student_owner_id: str) -> None:
    plan = await get_teacher_plan(db, teacher_id)
    rooms = await db.classrooms.count_documents({"teacher_id": teacher_id})
    if rooms > plan.get("classroom_limit", 1):
        raise HTTPException(status_code=402, detail="Classroom limit reached — upgrade plan")

    assigned = plan.get("assigned_seats") or []
    unique = {a.get("student_owner_id") for a in assigned if a.get("student_owner_id")}
    if student_owner_id in unique:
        return
    if len(unique) >= plan.get("seat_limit", 30):
        raise HTTPException(status_code=402, detail="Seat limit reached — upgrade your teacher plan")


async def register_teacher_seat(db, teacher_id: str, room_code: str, student_owner_id: str) -> None:
    await assert_teacher_can_add_student(db, teacher_id, room_code, student_owner_id)
    await db.teacher_subscriptions.update_one(
        {"teacher_id": teacher_id},
        {
            "$addToSet": {
                "assigned_seats": {
                    "student_owner_id": student_owner_id,
                    "room_code": room_code.upper(),
                    "assigned_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )


def register_teacher_billing_routes(api_router, db, get_current_user):
    @router.get("/teacher/billing")
    async def teacher_billing(user=Depends(get_current_user)):
        if not user or user.role != "teacher":
            raise HTTPException(status_code=403, detail="Teacher account required")
        plan = await get_teacher_plan(db, user.user_id)
        rooms = await db.classrooms.find({"teacher_id": user.user_id}, {"_id": 0, "room_code": 1, "name": 1}).to_list(50)
        seats_used = await count_teacher_seats(db, user.user_id)
        meta = PLANS.get(plan.get("plan", "free"), PLANS["free"])
        return {
            **plan,
            "seats_used": seats_used,
            "plans_available": PLANS,
            "price_label": meta["price_label"],
            "classrooms": rooms,
            "iap_product_ids": {
                "classroom": "cram_teacher_classroom_monthly",
                "school": "cram_teacher_school_monthly",
            },
        }

    @router.post("/teacher/billing/plan")
    async def update_teacher_plan(payload: TeacherPlanUpdate, user=Depends(get_current_user)):
        if not user or user.role != "teacher":
            raise HTTPException(status_code=403, detail="Teacher account required")
        if payload.plan not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        meta = PLANS[payload.plan]
        now = datetime.now(timezone.utc).isoformat()
        await db.teacher_subscriptions.update_one(
            {"teacher_id": user.user_id},
            {
                "$set": {
                    "plan": payload.plan,
                    "seat_limit": meta["seat_limit"],
                    "classroom_limit": meta["classroom_limit"],
                    "source": payload.source,
                    "updated_at": now,
                }
            },
            upsert=True,
        )
        return await get_teacher_plan(db, user.user_id)

    @router.post("/teacher/seats/assign")
    async def assign_seat(payload: SeatAssignRequest, user=Depends(get_current_user)):
        if not user or user.role != "teacher":
            raise HTTPException(status_code=403, detail="Teacher account required")
        room = await db.classrooms.find_one(
            {"room_code": payload.room_code.upper(), "teacher_id": user.user_id},
            {"_id": 0},
        )
        if not room:
            raise HTTPException(status_code=404, detail="Classroom not found")
        await register_teacher_seat(db, user.user_id, payload.room_code, payload.student_owner_id)
        return {"ok": True, "seats_used": await count_teacher_seats(db, user.user_id)}

    api_router.include_router(router)
