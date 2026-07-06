"""Email delivery via Resend (consent links + parent progress digests)."""
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "onboarding@resend.dev")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")
PRIVACY_POLICY_URL = os.environ.get("PRIVACY_POLICY_URL", f"{APP_BASE_URL}/privacy")


def _resend_configured() -> bool:
    key = RESEND_API_KEY.strip()
    return bool(key) and not key.startswith("PASTE")


async def send_email(to: str, subject: str, html: str) -> bool:
    if not _resend_configured():
        logger.info("[email stub] to=%s subject=%s", to, subject)
        logger.info("[email stub body] %s", html[:500])
        return False
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
        )
        if r.status_code >= 400:
            logger.error("Resend error %s: %s", r.status_code, r.text)
            return False
        return True


async def send_family_link_invite_email(parent_email: str, confirm_url: str) -> bool:
    subject = "Link your child's Cram Journey account — parental consent"
    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2>Link your child's account</h2>
      <p>Your child asked to link your email to their <strong>Cram Journey</strong> learning account.</p>
      <p>Please confirm so their progress can be saved and you can view learning reports.</p>
      <p>By confirming, you agree to our privacy policy:
        <a href="{PRIVACY_POLICY_URL}">{PRIVACY_POLICY_URL}</a></p>
      <p><a href="{confirm_url}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:bold">Confirm &amp; link parent account</a></p>
      <p style="color:#64748b;font-size:14px">If you did not request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <h3>連結子女帳戶（繁體中文）</h3>
      <p>您的子女希望將您的電郵連結至 <strong>Cram Journey</strong> 學習帳戶。</p>
      <p>請點擊下方連結確認，以便儲存學習進度及查看學習報告。</p>
      <p>確認即表示您已閱讀 <a href="{PRIVACY_POLICY_URL}">私隱政策</a>。</p>
      <p><a href="{confirm_url}">按此確認並連結家長帳戶</a></p>
      <p style="color:#64748b;font-size:14px">如非您本人申請，請忽略此電郵。</p>
    </div>
    """
    return await send_email(parent_email, subject, html)


async def send_consent_email(parent_email: str, confirm_url: str, consent_type: str) -> bool:
    label = consent_type.replace("_", " ")
    subject = f"Confirm parental consent — Learning Journey ({label})"
    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2>Parental consent required</h2>
      <p>Please confirm <strong>{label}</strong> consent for your child's Yanjoy learning account.</p>
      <p>By confirming, you agree to our privacy policy:
        <a href="{PRIVACY_POLICY_URL}">{PRIVACY_POLICY_URL}</a></p>
      <p><a href="{confirm_url}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:bold">Confirm consent</a></p>
      <p style="color:#64748b;font-size:14px">If you did not request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <h3>需要家長同意（繁體中文）</h3>
      <p>請確認您同意為子女啟用<strong>{label}</strong>功能，並已閱讀
        <a href="{PRIVACY_POLICY_URL}">私隱政策</a>。</p>
      <p><a href="{confirm_url}">按此確認同意</a></p>
      <p style="color:#64748b;font-size:14px">如非您本人申請，請忽略此電郵。</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">UK GDPR / ICO Children's Code — monitoring disclosure applies only after you confirm.</p>
    </div>
    """
    return await send_email(parent_email, subject, html)


async def send_progress_digest(
    parent_email: str,
    stats: dict,
    frequency: str = "weekly",
) -> bool:
    freq_label = {"daily": "Daily", "weekly": "Weekly"}.get(frequency, frequency.title())
    subject = f"Your child's learning progress ({freq_label})"
    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2>Learning Journey Progress</h2>
      <ul>
        <li>Adventures completed: {stats.get('total_sessions', 0)}</li>
        <li>Total score: {stats.get('total_score', 0)}</li>
        <li>Accuracy: {stats.get('accuracy_pct', 0)}%</li>
        <li>Current streak: {stats.get('current_streak', 0)} days</li>
      </ul>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <h3>學習進度摘要（繁體中文）</h3>
      <ul>
        <li>完成冒險：{stats.get('total_sessions', 0)} 次</li>
        <li>總分：{stats.get('total_score', 0)}</li>
        <li>準確率：{stats.get('accuracy_pct', 0)}%</li>
        <li>連續學習：{stats.get('current_streak', 0)} 天</li>
      </ul>
      <p style="color:#94a3b8;font-size:12px">You can change email frequency in the Parent Portal.</p>
    </div>
    """
    return await send_email(parent_email, subject, html)
