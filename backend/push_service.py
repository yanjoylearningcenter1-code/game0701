"""FCM push delivery via Firebase Admin (v3 §6.1)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def fcm_configured() -> bool:
    from firebase_auth import firebase_configured

    return firebase_configured()


def _ensure_firebase():
    from firebase_auth import _init_firebase

    app = _init_firebase()
    if not app:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON not configured")
    return app


async def send_fcm_to_tokens(
    tokens: List[str],
    *,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
) -> dict:
    """Send FCM notification to device tokens. Returns {sent, failed}."""
    if not tokens:
        return {"sent": 0, "failed": 0, "skipped": "no_tokens"}
    if not fcm_configured():
        return {"sent": 0, "failed": 0, "skipped": "fcm_not_configured"}

    try:
        from firebase_admin import messaging

        _ensure_firebase()
        payload_data = {k: str(v) for k, v in (data or {}).items()}
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=payload_data,
            tokens=tokens,
        )
        resp = messaging.send_each_for_multicast(message)
        return {"sent": resp.success_count, "failed": resp.failure_count}
    except Exception as e:
        logger.exception("FCM send failed: %s", e)
        return {"sent": 0, "failed": len(tokens), "error": str(e)}


async def send_fcm_to_owner(db, owner: str, *, title: str, body: str, data: Optional[dict] = None) -> dict:
    docs = await db.push_tokens.find({"owner": owner}, {"_id": 0}).to_list(20)
    tokens = [d["token"] for d in docs if d.get("token")]
    return await send_fcm_to_tokens(tokens, title=title, body=body, data=data)
