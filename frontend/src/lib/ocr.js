// OCR: hybrid server (Vision → Gemini) when keys set, else Tesseract.js fallback.
import { createWorker } from "tesseract.js";
import api from "@/lib/api";

export const OCR_LANGS = {
  auto: { code: "eng+chi_tra", label: "Auto 中英", short: "Auto" },
  eng: { code: "eng", label: "English", short: "EN" },
  zh: { code: "chi_tra", label: "繁體中文", short: "繁" },
  zh_trad: { code: "chi_tra", label: "繁體中文", short: "繁" },
  zh_simp: { code: "chi_sim", label: "简体中文", short: "简" },
};

const workerCache = new Map();

async function loadImageToCanvas(file, maxLongSide = 2400, { grayscale = true } = {}) {
  let bitmap;
  try {
    // "from-image" makes the browser respect EXIF orientation (many phone
    // cameras store the photo pixels landscape + a "rotate 90°" tag rather
    // than physically rotating them — without this, a portrait worksheet
    // photo can come out sideways/upside-down before OCR ever sees it,
    // which scrambles Vision/Gemini's reading-order reconstruction far more
    // for left-to-right English text than for individually-parsed Chinese
    // characters).
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      });
    }
  }

  const maxDim = Math.max(bitmap.width, bitmap.height);
  const targetLong = maxLongSide;
  const scale = maxDim < targetLong ? targetLong / maxDim : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (grayscale) {
    ctx.filter = "contrast(1.15) brightness(1.05)";
  }
  ctx.drawImage(bitmap, 0, 0, w, h);

  if (grayscale) {
    // Aggressive grayscale/contrast stretch — tuned for Tesseract, which does
    // much better on high-contrast B&W input. Vision/Gemini are full AI
    // vision models that read color photos natively and don't need (and can
    // be hurt by) this destructive preprocessing, so server-bound requests
    // skip it (see preprocessForServer below).
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      const c = Math.max(0, Math.min(255, (gray - 128) * 1.5 + 128));
      d[i] = d[i + 1] = d[i + 2] = c;
    }
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}

export async function preprocessImage(file, maxLongSide = 2400) {
  return loadImageToCanvas(file, maxLongSide, { grayscale: true });
}

/** Lighter, color-preserving preprocessing for server AI OCR (Vision/Gemini) —
 * just orientation-correct + resize, no destructive grayscale/contrast stretch. */
export async function preprocessForServer(file, maxLongSide = 2800) {
  return loadImageToCanvas(file, maxLongSide, { grayscale: false });
}

export function canvasToJpegBase64(canvas, quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode image"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function tesseractLangKey(langKey) {
  if (langKey === "zh_simp") return "zh_simp";
  if (langKey === "zh_trad" || langKey === "zh") return "zh_trad";
  return langKey in OCR_LANGS ? langKey : "auto";
}

async function getWorker(langKey, psm, onStatus) {
  const lang = (OCR_LANGS[tesseractLangKey(langKey)] || OCR_LANGS.auto).code;
  const cacheKey = `${lang}:${psm}`;
  if (workerCache.has(cacheKey)) return workerCache.get(cacheKey);

  const workerPromise = createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === "loading language traineddata") onStatus?.("Downloading language pack (first time only)…");
      else if (m.status === "recognizing text" && typeof m.progress === "number") {
        onStatus?.("Reading text…", m.progress);
      }
    },
  }).then(async (worker) => {
    await worker.setParameters({
      tessedit_pageseg_mode: String(psm),
      tessedit_ocr_engine_mode: "1",
      preserve_interword_spaces: "1",
    });
    return worker;
  });

  workerCache.set(cacheKey, workerPromise);
  return workerPromise;
}

export async function recognizeTesseract(canvas, langKey, onProgress) {
  const modes = [3, 6, 11];
  let best = "";
  for (const psm of modes) {
    const worker = await getWorker(langKey, psm, () => onProgress?.(0.3));
    const { data } = await worker.recognize(canvas);
    const text = (data?.text || "").trim();
    if (text.length > best.length && !looksGarbled(text)) best = text;
    else if (!best && text.length > best.length) best = text;
  }
  return best;
}

/** Server hybrid OCR (Vision → Gemini). Respects quota unless parent BYOK key set. */
export async function recognizeWithServer(canvas, langKey, onProgress, engine = "auto") {
  onProgress?.(0.05);
  const dataUrl = await canvasToJpegBase64(canvas);
  onProgress?.(0.15);
  const r = await api.post(
    "/ocr",
    { image_base64: dataUrl, lang_hint: langKey, engine },
    { timeout: 45000 },
  );
  onProgress?.(1);
  return {
    text: (r.data.text || "").trim(),
    source: r.data.source || "server",
    quota: r.data.quota,
    garbled: looksGarbled(r.data.text),
  };
}

export async function fetchOcrQuota() {
  const r = await api.get("/ocr/quota");
  return r.data;
}

/**
 * Smart OCR: server hybrid when available, else Tesseract.
 * Handles 402 quota / 429 rate limit with graceful fallback.
 */
export async function recognizeSmart(file, langKey = "auto", onProgress) {
  let quotaExceeded = false;
  let rateLimited = false;

  try {
    const caps = await api.get("/ocr/capabilities", { timeout: 5000 });
    const hasByok = Boolean(localStorage.getItem("parent_gemini_key"));
    if (caps.data?.gemini || caps.data?.vision || hasByok) {
      onProgress?.(0.02);
      const serverCanvas = await preprocessForServer(file);
      const server = await recognizeWithServer(serverCanvas, langKey, onProgress, "auto");
      if (server.text && !server.garbled) return server;
      if (server.text) return { ...server, garbled: true };
    }
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail;
    if (status === 402) {
      quotaExceeded = true;
    } else if (status === 429) {
      rateLimited = true;
    } else if (status === 503) {
      // No API keys — fall through to Tesseract
    } else if (status === 502 || status === 504) {
      console.warn("Server OCR failed, trying basic OCR", err);
    } else if (!err.response) {
      throw new Error("NETWORK");
    }
  }

  onProgress?.(0.1);
  const tesseractCanvas = await preprocessImage(file);
  const text = await recognizeTesseract(tesseractCanvas, langKey, onProgress);
  return {
    text,
    source: "tesseract",
    garbled: looksGarbled(text),
    quotaExceeded,
    rateLimited,
  };
}

/** @deprecated use recognizeSmart */
export async function recognize(source, langKey = "auto", onProgress) {
  if (source instanceof HTMLCanvasElement) {
    return recognizeTesseract(source, langKey, onProgress);
  }
  const r = await recognizeSmart(source, langKey, onProgress);
  return r.text;
}

/** @deprecated use recognizeWithServer */
export async function recognizeWithGemini(canvas, langKey, onProgress) {
  return recognizeWithServer(canvas, langKey, onProgress, "gemini");
}

export function looksGarbled(text) {
  if (!text || text.length < 4) return true;
  let good = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      ch === "\n" ||
      ch === "\t"
    ) {
      good++;
    }
  }
  return good / text.length < 0.55;
}
