// OCR helper for Magic Camera Upload
// Fixes AI-slop OCR problem: combining eng+chi_tra+chi_sim confuses Tesseract
// LSTM heavily. We now pick the smallest useful language set and preprocess
// the image (grayscale + contrast + upscale small images) before feeding it
// to Tesseract. This gives dramatic quality gains on phone photos of English
// worksheets.
import Tesseract from "tesseract.js";

export const OCR_LANGS = {
  auto: { code: "eng+chi_tra", label: "Auto (Both)", short: "Auto" },
  eng:  { code: "eng",         label: "English only", short: "English" },
  zh:   { code: "chi_tra",     label: "中文", short: "中文" },
};

// Convert a File/Blob → preprocessed Canvas (grayscale + gentle contrast +
// upscale small photos so Tesseract has enough pixels per character).
export async function preprocessImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxDim = Math.max(bitmap.width, bitmap.height);
  // Tesseract prefers >~1500px on the long edge. Upscale small images.
  const targetLong = 1600;
  const scale = maxDim < targetLong ? targetLong / maxDim : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Grayscale + gentle contrast boost (1.35x around midpoint). Aggressive
  // thresholds destroy the LSTM input — a soft stretch works best.
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    const c = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    d[i] = d[i + 1] = d[i + 2] = c;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Run Tesseract with tuned params on a preprocessed canvas or file.
// PSM=6 (uniform block of text) is best for worksheets. OEM=1 (LSTM only)
// avoids the noisy legacy engine.
export async function recognize(source, langKey = "auto", onProgress) {
  const lang = (OCR_LANGS[langKey] || OCR_LANGS.auto).code;
  const { data } = await Tesseract.recognize(source, lang, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
    tessedit_pageseg_mode: "6",
    tessedit_ocr_engine_mode: "1",
    preserve_interword_spaces: "1",
  });
  return (data?.text || "").trim();
}

// Simple heuristic: is the OCR output mostly usable?
// If <60% of chars are printable letters/digits/punct/spaces or CJK, it's
// probably a garbled scan and we should suggest retrying with a different lang.
export function looksGarbled(text) {
  if (!text || text.length < 6) return true;
  let good = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x20 && code <= 0x7e) || // ASCII printable
      (code >= 0x4e00 && code <= 0x9fff) || // CJK unified
      ch === "\n" || ch === "\t"
    ) good++;
  }
  return good / text.length < 0.6;
}
