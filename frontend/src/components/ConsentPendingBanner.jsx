import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/lib/i18n";

/** Shown when parent consent email is pending — kid can play locally but progress won't save. */
export default function ConsentPendingBanner({ dataConsent }) {
  const navigate = useNavigate();
  const { t } = useLang();
  if (!dataConsent || dataConsent.status === "active" || dataConsent.status === "legacy_open") {
    return null;
  }
  const pending = dataConsent.status === "pending";
  return (
    <div
      className="rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 mb-4"
      data-testid="consent-pending-banner"
    >
      <div className="font-display font-bold mb-1">
        {pending ? t("consent_pending_title") : t("consent_required_title")}
      </div>
      <p className="text-amber-100/80 text-xs leading-relaxed">
        {pending
          ? t("consent_pending_body", { email: dataConsent.parent_email || "…" })
          : t("consent_required_body")}
      </p>
      <button
        type="button"
        onClick={() => navigate("/settings")}
        className="mt-2 text-xs underline text-amber-200"
      >
        {t("consent_go_settings")}
      </button>
    </div>
  );
}
