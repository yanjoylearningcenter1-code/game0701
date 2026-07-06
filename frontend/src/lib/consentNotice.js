import api from "@/lib/api";
import { toast } from "sonner";

let cachedConsent = null;

/** Read data_consent from session cache or /home-status. */
export async function fetchDataConsent() {
  if (cachedConsent) return cachedConsent;
  try {
    const raw = sessionStorage.getItem("home_status_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data_consent) {
        cachedConsent = parsed.data_consent;
        return cachedConsent;
      }
    }
  } catch {
    /* ignore stale cache */
  }
  try {
    const r = await api.get("/home-status");
    cachedConsent = r.data?.data_consent ?? null;
    sessionStorage.setItem("home_status_cache", JSON.stringify(r.data || {}));
    return cachedConsent;
  } catch {
    return null;
  }
}

export function invalidateDataConsentCache() {
  cachedConsent = null;
  sessionStorage.removeItem("home_status_cache");
}

export function canCollectLearningData(dataConsent) {
  if (!dataConsent) return false;
  if (dataConsent.can_collect_learning_data === true) return true;
  return dataConsent.status === "active" || dataConsent.status === "legacy_open";
}

/** Informational toast — play continues; progress may not persist server-side. */
export function showNoSaveProgressToast(t, step) {
  const stepNum = step != null ? Number(step) : null;
  const title =
    stepNum && stepNum % 2 === 1
      ? t("consent_no_save_step", { step: stepNum })
      : t("consent_play_without_save");
  toast.warning(title, { description: t("consent_no_save_body"), duration: 6000 });
}
