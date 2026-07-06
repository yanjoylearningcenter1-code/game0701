"""OCR engines, quotas, and subscription tiers (Strategy B → C)."""
from __future__ import annotations

import asyncio
import base64
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Strategy B (pre–App Store): 3 AI scans / device / day on free tier
AI_SCANS_PER_DAY_FREE = int(os.environ.get("AI_SCANS_PER_DAY_FREE", "3"))
# Strategy C lite at launch: set e.g. 5 for lifetime cap (0 = no lifetime cap)
AI_SCANS_LIFETIME_FREE = int(os.environ.get("AI_SCANS_LIFETIME_FREE", "0"))

VISION_API_KEY = os.environ.get("GOOGLE_CLOUD_VISION_API_KEY", "")
VISION_ENABLED = bool(VISION_API_KEY.strip()) and not VISION_API_KEY.startswith("PASTE")

LANG_NOTES = {
    "auto": "Include English and Chinese (Traditional or Simplified) as shown.",
    "eng": "The page is mostly English.",
    "zh": "The page is mostly Chinese — preserve 繁體 or 简体 as printed.",
    "zh_trad": "Traditional Chinese 繁體中文.",
    "zh_simp": "Simplified Chinese 简体中文.",
}

VISION_LANG_HINTS = {
    "auto": ["en", "zh-TW", "zh-CN"],
    "eng": ["en"],
    "zh": ["zh-TW", "zh-CN"],
    "zh_trad": ["zh-TW"],
    "zh_simp": ["zh-CN"],
}


def decode_image_base64(data: str) -> tuple[bytes, str]:
    raw = (data or "").strip()
    if raw.startswith("data:") and "," in raw:
        header, b64 = raw.split(",", 1)
        mime = header.split(";")[0].replace("data:", "") or "image/jpeg"
        return base64.b64decode(b64), mime
    return base64.b64decode(raw), "image/jpeg"


async def get_device_profile(db, owner: str) -> dict:
    doc = await db.device_profiles.find_one({"owner": owner}, {"_id": 0})
    if doc:
        return doc
    kid_id = owner.removeprefix("guest_")
    doc = {
        "owner": owner,
        "kid_device_id": kid_id,
        "subscription_tier": "free",
        "diamonds": 0,
        "coins": 0,
        "unlocked_skins": ["fox", "owl", "robot"],
        "equipped_skin": "fox",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.device_profiles.insert_one({**doc})
    return doc


async def get_quota_status(db, owner: str) -> dict:
    profile = await get_device_profile(db, owner)
    tier = profile.get("subscription_tier", "free")
    today = datetime.now(timezone.utc).date().isoformat()
    daily = await db.ai_scan_usage.find_one({"owner": owner, "date": today}, {"_id": 0}) or {}
    lifetime = await db.ai_scan_lifetime.find_one({"owner": owner}, {"_id": 0}) or {}
    daily_used = daily.get("count", 0)
    lifetime_used = lifetime.get("count", 0)
    if tier == "premium":
        return {
            "subscription_tier": tier,
            "daily_used": daily_used,
            "daily_limit": None,
            "daily_remaining": None,
            "lifetime_used": lifetime_used,
            "lifetime_limit": None,
            "can_scan": True,
        }
    daily_remaining = max(0, AI_SCANS_PER_DAY_FREE - daily_used)
    lifetime_remaining = None
    if AI_SCANS_LIFETIME_FREE > 0:
        lifetime_remaining = max(0, AI_SCANS_LIFETIME_FREE - lifetime_used)
    can_scan = daily_remaining > 0 and (
        AI_SCANS_LIFETIME_FREE <= 0 or lifetime_remaining > 0
    )
    return {
        "subscription_tier": tier,
        "daily_used": daily_used,
        "daily_limit": AI_SCANS_PER_DAY_FREE,
        "daily_remaining": daily_remaining,
        "lifetime_used": lifetime_used,
        "lifetime_limit": AI_SCANS_LIFETIME_FREE or None,
        "lifetime_remaining": lifetime_remaining,
        "can_scan": can_scan,
        "vision_available": VISION_ENABLED,
    }


async def consume_ai_scan(db, owner: str) -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    await db.ai_scan_usage.update_one(
        {"owner": owner, "date": today},
        {"$inc": {"count": 1}, "$setOnInsert": {"date": today}},
        upsert=True,
    )
    await db.ai_scan_lifetime.update_one(
        {"owner": owner},
        {"$inc": {"count": 1}, "$setOnInsert": {"owner": owner}},
        upsert=True,
    )


async def vision_ocr_image(image_bytes: bytes, lang_hint: str = "auto") -> str:
    if not VISION_ENABLED:
        raise RuntimeError("GOOGLE_CLOUD_VISION_API_KEY not configured")
    hints = VISION_LANG_HINTS.get(lang_hint or "auto", VISION_LANG_HINTS["auto"])
    body = {
        "requests": [{
            "image": {"content": base64.b64encode(image_bytes).decode("ascii")},
            "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            "imageContext": {"languageHints": hints},
        }]
    }
    url = f"https://vision.googleapis.com/v1/images:annotate?key={VISION_API_KEY}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(url, json=body)
        if r.status_code == 429:
            raise RateLimitError("Google Vision rate limited")
        r.raise_for_status()
        data = r.json()
    responses = data.get("responses") or []
    if not responses:
        return ""
    err = responses[0].get("error")
    if err:
        raise RuntimeError(err.get("message", "Vision API error"))
    full = responses[0].get("fullTextAnnotation", {})
    return (full.get("text") or "").strip()


class RateLimitError(Exception):
    pass


async def gemini_ocr_image(
    image_bytes: bytes,
    mime_type: str,
    lang_hint: str,
    client_factory,
    genai_types,
    api_key: Optional[str] = None,
) -> str:
    """Gemini Vision OCR. Optional api_key for BYOK (user-supplied key)."""
    if api_key:
        import google.genai as genai
        client = genai.Client(api_key=api_key)
    else:
        client = client_factory()
    lang_note = LANG_NOTES.get(lang_hint or "auto", LANG_NOTES["auto"])
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model="gemini-3-flash-preview",
                contents=genai_types.Content(
                    parts=[
                        genai_types.Part.from_bytes(
                            data=image_bytes, mime_type=mime_type or "image/jpeg"
                        ),
                        genai_types.Part(text=f"Extract all visible text from this image.\n{lang_note}"),
                    ]
                ),
                config=genai_types.GenerateContentConfig(
                    system_instruction=(
                        "You are a precise OCR engine for student worksheets and slides. "
                        "The photo may be rotated, tilted, or upside-down, or the page "
                        "may have multiple columns, word banks, or boxed sections — "
                        "mentally re-orient the page and reconstruct the NATURAL human "
                        "reading order (top-to-bottom, left-to-right within each "
                        "column/section) before outputting, exactly like a person would "
                        "read it after turning the page the right way up. Never output "
                        "text in raw left-to-right pixel-scan order if that would "
                        "scramble words — group letters back into whole words and "
                        "words back into their original lines/sentences. "
                        "Return ONLY the extracted text with natural line breaks. "
                        "Do not translate or summarize."
                    ),
                    temperature=0,
                ),
            ),
            timeout=25.0,
        )
    except Exception as e:
        msg = str(e).lower()
        if "429" in msg or "resource exhausted" in msg or "quota" in msg:
            raise RateLimitError(str(e)) from e
        raise
    return (response.text or "").strip()


DEFAULT_QUOTA_FALLBACK = {
    "subscription_tier": "free",
    "daily_used": 0,
    "daily_limit": AI_SCANS_PER_DAY_FREE,
    "daily_remaining": AI_SCANS_PER_DAY_FREE,
    "lifetime_used": 0,
    "lifetime_limit": AI_SCANS_LIFETIME_FREE or None,
    "lifetime_remaining": None,
    "can_scan": True,
    "vision_available": VISION_ENABLED,
    "mongo": False,
}


async def safe_get_quota_status(db, owner: str) -> dict:
    try:
        return await get_quota_status(db, owner)
    except Exception as exc:
        logger.warning("quota status unavailable: %s", exc)
        return {**DEFAULT_QUOTA_FALLBACK}


async def run_hybrid_ocr(
    db,
    owner: str,
    image_bytes: bytes,
    mime_type: str,
    lang_hint: str,
    *,
    engine: str = "auto",
    skip_quota: bool = False,
    byok_gemini_key: Optional[str] = None,
    gemini_enabled: bool = False,
    client_factory=None,
    genai_types=None,
) -> dict:
    """Run one OCR engine or auto chain: vision → gemini (BYOK or server key)."""
    if skip_quota:
        quota_before = {**DEFAULT_QUOTA_FALLBACK, "can_scan": True, "lab": True}
    else:
        quota_before = await safe_get_quota_status(db, owner)
        if not quota_before["can_scan"]:
            raise QuotaExceededError(quota_before)

    use_byok = bool(byok_gemini_key)
    errors = []

    async def _try_vision():
        if engine not in ("auto", "vision"):
            return None
        if not VISION_ENABLED:
            if engine == "vision":
                raise RuntimeError("GOOGLE_CLOUD_VISION_API_KEY not set in backend/.env")
            return None
        return await vision_ocr_image(image_bytes, lang_hint)

    async def _try_gemini():
        if engine not in ("auto", "gemini"):
            return None
        if not use_byok and not gemini_enabled:
            if engine == "gemini":
                raise RuntimeError("GEMINI_API_KEY not set — use BYOK or add server key")
            return None
        return await gemini_ocr_image(
            image_bytes, mime_type, lang_hint, client_factory, genai_types,
            api_key=byok_gemini_key if use_byok else None,
        )

    text = ""
    source = ""
    chain = []
    if engine == "vision":
        chain = [("vision", _try_vision)]
    elif engine == "gemini":
        chain = [("gemini", _try_gemini)]
    else:
        # Gemini (LLM) reconstructs natural reading order for rotated/multi-column
        # worksheets far better than Vision's geometric block detection, which is
        # the main cause of "letters floating everywhere" on messier English
        # layouts. Prefer it first when available; Vision is still the fallback
        # (e.g. Gemini rate-limited) since it has no daily quota of its own.
        chain = [("gemini", _try_gemini), ("vision", _try_vision)]

    for name, fn in chain:
        try:
            result = await fn()
            if result is None:
                continue
            if result.strip():
                text = result.strip()
                source = name if not use_byok or name != "gemini" else "gemini_byok"
                break
        except RateLimitError as e:
            errors.append(f"{name}: rate limited")
            logger.warning("OCR %s rate limited: %s", name, e)
        except Exception as e:
            errors.append(f"{name}: {e}")
            logger.warning("OCR %s failed: %s", name, e)

    if not text:
        detail = "; ".join(errors) if errors else "No OCR engine available"
        raise RuntimeError(detail)

    if not skip_quota and not use_byok and source in ("vision", "gemini"):
        try:
            await consume_ai_scan(db, owner)
        except Exception as exc:
            logger.warning("could not record scan usage: %s", exc)

    if skip_quota:
        quota_after = quota_before
    else:
        quota_after = await safe_get_quota_status(db, owner)
    return {
        "text": text,
        "source": source,
        "quota": quota_after,
        "errors": errors,
    }


class QuotaExceededError(Exception):
    def __init__(self, quota: dict):
        self.quota = quota
        super().__init__("AI scan quota exceeded")
