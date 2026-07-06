import React from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/lib/i18n";

/** Soft info banner — kid can play; progress may not save until parent confirms. */
export default function ConsentPendingBanner({ dataConsent }) {
  const { t } = useLang();
  if (!dataConsent || dataConsent.status === "active" || dataConsent.status === "legacy_open") {
    return null;
  }
  const pending = dataConsent.status === "pending";
  return (
    <div
      className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-50 mb-4"
      data-testid="consent-pending-banner"
    >
      <div className="font-display font-bold mb-1">
        {pending ? t("consent_play_ok_title") : t("consent_play_without_save")}
      </div>
      <p className="text-sky-100/80 text-xs leading-relaxed">
        {pending
          ? t("consent_pending_body", { email: dataConsent.parent_email || "…" })
          : t("consent_no_save_body")}
      </p>
      <Link
        to="/settings"
        className="mt-2 inline-block text-xs underline text-sky-200 hover:text-white"
      >
        {t("consent_go_settings")}
      </Link>
    </div>
  );
}
