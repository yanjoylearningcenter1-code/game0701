import api from "@/lib/api";

/** Clean raw OCR via backend LLM + deterministic fallback. */
export async function cleanOcrText(rawText, subject = "general") {
  const raw = (rawText || "").trim();
  if (!raw) {
    return { cleaned_text: "", confidence: "low", changes_summary: null };
  }
  try {
    const r = await api.post("/materials/clean", { raw_text: raw, subject }, { timeout: 12000 });
    return r.data;
  } catch {
    return { cleaned_text: raw, confidence: "low", changes_summary: "Cleanup unavailable — using raw text" };
  }
}

/** Persist cleaned + raw OCR in sessionStorage for downstream pages. */
export function storeCleanedOcr(rawText, cleanResult) {
  const raw = (rawText || "").trim();
  const cleaned = (cleanResult?.cleaned_text || raw).trim();
  sessionStorage.setItem("raw_ocr_text", raw);
  sessionStorage.setItem("ocr_text", cleaned);
  sessionStorage.setItem("ocr_confidence", cleanResult?.confidence || "high");
  sessionStorage.setItem("text_source", "ocr");
  if (cleanResult?.changes_summary) {
    sessionStorage.setItem("ocr_changes_summary", cleanResult.changes_summary);
  } else {
    sessionStorage.removeItem("ocr_changes_summary");
  }
  return cleaned;
}

/**
 * Text the child/parent typed or pasted themselves never went through OCR —
 * running it through the "clean up OCR artifacts" LLM prompt is pointless
 * (there are no scan artifacts to fix) and previously mislabeled clean,
 * correct, manually-typed text as "low confidence" simply because the prompt
 * wasn't designed for short/clean input. Store it as-is instead.
 */
export function storeManualText(rawText) {
  const raw = (rawText || "").trim();
  sessionStorage.setItem("raw_ocr_text", raw);
  sessionStorage.setItem("ocr_text", raw);
  sessionStorage.setItem("ocr_confidence", "manual");
  sessionStorage.setItem("text_source", "manual");
  sessionStorage.removeItem("ocr_changes_summary");
  return raw;
}
