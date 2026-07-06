/** Detect 403 consent_required from FastAPI detail payloads. */
export function isConsentRequiredError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return false;
  if (typeof detail === "object" && detail.code === "consent_required") return detail;
  if (typeof detail === "string" && detail.toLowerCase().includes("consent")) {
    return { code: "consent_required", message: detail };
  }
  return false;
}

export function consentToastMessage(detail, t) {
  if (detail?.status === "pending") return t("consent_pending_title");
  return t("consent_required_title");
}
