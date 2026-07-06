"""Verifiable parental consent gate before persisting kid learning data."""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

from fastapi import HTTPException

DATA_CONSENT_TYPE = "data_collection"
STRICT_DATA_CONSENT = os.environ.get("STRICT_DATA_CONSENT", "true").lower() in ("1", "true", "yes")


async def has_data_collection_consent(db, kid_owner_id: str) -> bool:
    rec = await db.consent_records.find_one(
        {"kid_owner_id": kid_owner_id, "consent_type": DATA_CONSENT_TYPE, "granted": True},
        {"_id": 1},
    )
    return rec is not None


async def get_data_consent_status(db, kid_owner_id: str) -> Dict[str, Any]:
    if await has_data_collection_consent(db, kid_owner_id):
        return {"status": "active", "can_collect_learning_data": True}

    pending_docs = await db.consent_records.find(
        {
            "kid_owner_id": kid_owner_id,
            "consent_type": DATA_CONSENT_TYPE,
            "granted": False,
            "consent_token": {"$ne": None},
        },
        {"_id": 0, "parent_email": 1},
    ).sort("created_at", -1).limit(1).to_list(1)
    pending = pending_docs[0] if pending_docs else None
    if pending:
        return {
            "status": "pending",
            "can_collect_learning_data": False,
            "parent_email": pending.get("parent_email"),
            "message": "Waiting for parent to confirm the email link",
        }

    if not STRICT_DATA_CONSENT:
        return {"status": "legacy_open", "can_collect_learning_data": True}

    return {
        "status": "required",
        "can_collect_learning_data": False,
        "message": "Link a parent and confirm consent before saving progress",
    }


async def assert_can_collect_learning_data(db, kid_owner_id: str) -> None:
    status = await get_data_consent_status(db, kid_owner_id)
    if status.get("can_collect_learning_data"):
        return
    raise HTTPException(
        status_code=403,
        detail={
            "code": "consent_required",
            "consent_type": DATA_CONSENT_TYPE,
            "status": status.get("status"),
            "message": status.get("message"),
        },
    )
