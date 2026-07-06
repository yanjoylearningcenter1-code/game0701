"""In-app purchase entitlements (RevenueCat webhook + client sync)."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel

router = APIRouter()

REVENUECAT_WEBHOOK_SECRET = os.environ.get("REVENUECAT_WEBHOOK_SECRET", "")
PREMIUM_ENTITLEMENT = os.environ.get("IAP_PREMIUM_ENTITLEMENT", "premium")
TEACHER_CLASSROOM_ENTITLEMENT = os.environ.get("IAP_TEACHER_CLASSROOM_ENTITLEMENT", "teacher_classroom")
TEACHER_SCHOOL_ENTITLEMENT = os.environ.get("IAP_TEACHER_SCHOOL_ENTITLEMENT", "teacher_school")


class IapSyncRequest(BaseModel):
    kid_owner_id: Optional[str] = None
    teacher_id: Optional[str] = None
    entitlements: dict = {}


async def apply_premium_to_device(db, owner: str, active: bool) -> None:
    tier = "premium" if active else "free"
    now = datetime.now(timezone.utc).isoformat()
    await db.device_profiles.update_one(
        {"owner": owner},
        {"$set": {"subscription_tier": tier, "iap_updated_at": now}, "$setOnInsert": {"coins": 0}},
        upsert=True,
    )


async def apply_teacher_plan(db, teacher_id: str, plan: str) -> None:
    from teacher_billing import PLANS, get_teacher_plan

    if plan not in PLANS:
        plan = "free"
    meta = PLANS[plan]
    now = datetime.now(timezone.utc).isoformat()
    await db.teacher_subscriptions.update_one(
        {"teacher_id": teacher_id},
        {
            "$set": {
                "plan": plan,
                "seat_limit": meta["seat_limit"],
                "classroom_limit": meta["classroom_limit"],
                "source": "iap",
                "updated_at": now,
            }
        },
        upsert=True,
    )
    await get_teacher_plan(db, teacher_id)


def _entitlement_active(event: dict, key: str) -> bool:
    ent = (event.get("entitlements") or {}).get(key) or {}
    if ent.get("expires_date") is None and ent.get("product_identifier"):
        return True
    return bool(ent.get("is_active"))


def register_iap_routes(api_router, db, get_current_user, get_owner_id):
    @router.post("/iap/sync")
    async def iap_sync(payload: IapSyncRequest, user=Depends(get_current_user)):
        """Client reports active entitlements after purchase/restore (RevenueCat SDK)."""
        ents = payload.entitlements or {}
        if payload.kid_owner_id:
            if user and user.role == "parent":
                active = bool(ents.get(PREMIUM_ENTITLEMENT, {}).get("active"))
                await apply_premium_to_device(db, payload.kid_owner_id, active)
                return {"kid_owner_id": payload.kid_owner_id, "subscription_tier": "premium" if active else "free"}
            owner = payload.kid_owner_id
            active = bool(ents.get(PREMIUM_ENTITLEMENT, {}).get("active"))
            await apply_premium_to_device(db, owner, active)
            return {"kid_owner_id": owner, "subscription_tier": "premium" if active else "free"}

        if payload.teacher_id and user and user.role == "teacher":
            if ents.get(TEACHER_SCHOOL_ENTITLEMENT, {}).get("active"):
                plan = "school"
            elif ents.get(TEACHER_CLASSROOM_ENTITLEMENT, {}).get("active"):
                plan = "classroom"
            else:
                plan = "free"
            await apply_teacher_plan(db, user.user_id, plan)
            return {"teacher_id": user.user_id, "plan": plan}

        raise HTTPException(status_code=400, detail="kid_owner_id or teacher entitlement required")

    @router.post("/iap/webhook/revenuecat")
    async def revenuecat_webhook(
        request: Request,
        authorization: Optional[str] = Header(default=None),
    ):
        if REVENUECAT_WEBHOOK_SECRET:
            token = (authorization or "").replace("Bearer ", "")
            if token != REVENUECAT_WEBHOOK_SECRET:
                raise HTTPException(status_code=401, detail="Invalid webhook secret")

        body = await request.json()
        event = body.get("event") or body
        app_user_id = event.get("app_user_id") or event.get("original_app_user_id")
        if not app_user_id:
            return {"ok": True, "skipped": "no app_user_id"}

        entitlements = event.get("entitlements") or {}
        premium_on = _entitlement_active({"entitlements": entitlements}, PREMIUM_ENTITLEMENT)
        if app_user_id.startswith("teacher_"):
            teacher_id = app_user_id.replace("teacher_", "", 1)
            if _entitlement_active({"entitlements": entitlements}, TEACHER_SCHOOL_ENTITLEMENT):
                await apply_teacher_plan(db, teacher_id, "school")
            elif _entitlement_active({"entitlements": entitlements}, TEACHER_CLASSROOM_ENTITLEMENT):
                await apply_teacher_plan(db, teacher_id, "classroom")
            else:
                await apply_teacher_plan(db, teacher_id, "free")
        else:
            await apply_premium_to_device(db, app_user_id, premium_on)

        return {"ok": True}

    @router.get("/iap/config")
    async def iap_config():
        return {
            "provider": "revenuecat",
            "premium_entitlement": PREMIUM_ENTITLEMENT,
            "products": {
                "premium_monthly": os.environ.get("IAP_PRODUCT_PREMIUM", "cram_premium_monthly"),
                "teacher_classroom": os.environ.get("IAP_PRODUCT_TEACHER_CLASS", "cram_teacher_classroom_monthly"),
                "teacher_school": os.environ.get("IAP_PRODUCT_TEACHER_SCHOOL", "cram_teacher_school_monthly"),
            },
            "revenuecat_api_key_ios": os.environ.get("REVENUECAT_API_KEY_IOS", ""),
            "revenuecat_api_key_android": os.environ.get("REVENUECAT_API_KEY_ANDROID", ""),
        }

    api_router.include_router(router)
