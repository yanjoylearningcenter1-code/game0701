"""Firebase Admin token verification — replaces Emergent OAuth proxy."""
import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_firebase_app = None


def firebase_configured() -> bool:
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    return bool(raw) and not raw.startswith("PASTE")


def _init_firebase():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    if not firebase_configured():
        return None
    import firebase_admin
    from firebase_admin import credentials

    cred_dict = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"])
    _firebase_app = firebase_admin.initialize_app(credentials.Certificate(cred_dict))
    return _firebase_app


async def verify_firebase_id_token(id_token: str) -> Optional[dict]:
    """Returns {email, name, picture, uid} or None."""
    if not firebase_configured():
        return None
    try:
        from firebase_admin import auth as firebase_auth

        _init_firebase()
        decoded = firebase_auth.verify_id_token(id_token)
        return {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name") or (decoded.get("email") or "").split("@")[0],
            "picture": decoded.get("picture"),
        }
    except Exception as e:
        logger.exception("Firebase verify failed: %s", e)
        return None
