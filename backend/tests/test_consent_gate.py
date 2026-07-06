"""Unit tests for consent_gate (no live server)."""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock

# Ensure strict mode for tests unless overridden
os.environ.setdefault("STRICT_DATA_CONSENT", "true")

from consent_gate import (
    assert_can_collect_learning_data,
    get_data_consent_status,
    has_data_collection_consent,
    DATA_CONSENT_TYPE,
)
from fastapi import HTTPException


def _mock_db(*, granted=None, pending=None):
    db = MagicMock()
    consent_records = MagicMock()

    async def find_one(query, projection=None):
        if query.get("granted") is True:
            return {"_id": "x"} if granted else None
        return None

    async def find(query, projection=None):
        cursor = MagicMock()

        async def to_list(n):
            if pending:
                return [pending]
            return []

        cursor.sort = MagicMock(return_value=cursor)
        cursor.limit = MagicMock(return_value=cursor)
        cursor.to_list = to_list
        return cursor

    consent_records.find_one = AsyncMock(side_effect=find_one)
    consent_records.find = find
    db.consent_records = consent_records
    return db


@pytest.mark.asyncio
async def test_has_consent_when_granted():
    db = _mock_db(granted=True)
    assert await has_data_collection_consent(db, "kid_1") is True


@pytest.mark.asyncio
async def test_status_active_when_granted():
    db = _mock_db(granted=True)
    status = await get_data_consent_status(db, "kid_1")
    assert status["status"] == "active"
    assert status["can_collect_learning_data"] is True


@pytest.mark.asyncio
async def test_status_pending():
    db = _mock_db(pending={"parent_email": "p@test.com"})
    status = await get_data_consent_status(db, "kid_1")
    assert status["status"] == "pending"
    assert status["can_collect_learning_data"] is False
    assert status["parent_email"] == "p@test.com"


@pytest.mark.asyncio
async def test_status_required_when_strict():
    db = _mock_db()
    status = await get_data_consent_status(db, "kid_1")
    assert status["status"] == "required"
    assert status["can_collect_learning_data"] is False


@pytest.mark.asyncio
async def test_assert_raises_403():
    db = _mock_db()
    with pytest.raises(HTTPException) as exc:
        await assert_can_collect_learning_data(db, "kid_1")
    assert exc.value.status_code == 403
    assert exc.value.detail["code"] == "consent_required"
    assert exc.value.detail["consent_type"] == DATA_CONSENT_TYPE
