// System 5-Lite (讀默/背默 amendment B/C): the real stimulus in dictation is the
// spoken word, not text or pictures. This wraps the browser/webview Web Speech
// API (available in Chrome, Safari, and Capacitor's native webviews — no extra
// native plugin or backend audio pipeline needed) so BattlePage never has to
// show the answer as text for "typing"/"full_recall" challenges.

import { answersEquivalent } from "./cjkVariants";

function detectLang(text) {
  if (!text) return "en-US";
  // Any CJK ideograph present → treat as Cantonese/Chinese for TTS purposes.
  return /[\u4e00-\u9fff]/.test(text) ? "zh-HK" : "en-US";
}

let voicesCache = null;
function getVoices() {
  if (!("speechSynthesis" in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v && v.length) voicesCache = v;
  return voicesCache || v || [];
}

// Some webviews (notably Capacitor's Android/iOS shells) load voices
// asynchronously — this warms the cache once so the first dictation prompt
// doesn't silently speak with a wrong/default voice.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => getVoices();
  getVoices();
}

function pickVoice(lang) {
  const voices = getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(lang.split("-")[0])) ||
    null
  );
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Speak `text` aloud with no visible transcript. Returns true if speech was
 * actually dispatched, false if the platform has no TTS support (caller
 * should show a "no audio available" fallback rather than fail silently).
 */
export function speak(text, { lang, rate = 0.85 } = {}) {
  if (!isSpeechSupported() || !text) return false;
  try {
    window.speechSynthesis.cancel(); // don't stack overlapping utterances
    const utter = new SpeechSynthesisUtterance(text);
    const resolvedLang = lang || detectLang(text);
    utter.lang = resolvedLang;
    utter.rate = rate;
    const voice = pickVoice(resolvedLang);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
    return true;
  } catch (e) {
    console.warn("TTS speak failed", e);
    return false;
  }
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

// Loose grading for typed dictation answers — trims whitespace, ignores case
// for latin scripts, and (for CJK) strips punctuation, since the point is
// testing recall of the character/word, not exact keyboard punctuation entry.
export function normalizeAnswer(str) {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/[，。！？、,.!?\s]/g, "");
}

// Character-level similarity (Longest Common Subsequence ratio) used for the
// 背默 full_recall pass bar: "完整還原成篇", not a partial-sentence check, but
// typed input from a child shouldn't fail over one stray punctuation mark.
export function textSimilarity(a, b) {
  const s1 = normalizeAnswer(a);
  const s2 = normalizeAnswer(b);
  if (!s1.length && !s2.length) return 1;
  if (!s1.length || !s2.length) return 0;
  const m = s1.length, n = s2.length;
  let prev = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      cur[j] = s1[i - 1] === s2[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  const lcs = prev[n];
  return lcs / Math.max(m, n);
}

// 背默 Ready Check must validate the FULL passage, not a fragment (spec Section
// C/D.7) — the threshold is intentionally high (typos forgiven, skipped
// sentences are not).
export const FULL_RECALL_PASS_THRESHOLD = 0.90;
export const TYPING_PASS_THRESHOLD = 1.0; // single word/char — exact after normalization

/** Grade G4/G5/G18 fill answers: accept full word OR just the missing character(s). */
export function matchesFillAnswer(typed, challenge) {
  const t = (typed || "").trim();
  if (!t) return false;
  const expected = challenge?.answer || "";
  if (!expected) return false;
  if (answersEquivalent(t, expected)) return true;

  const missing = challenge.missing_part;
  if (missing && answersEquivalent(t, missing)) return true;

  const masked = challenge.masked || "";
  if (masked.includes("_") || masked.includes("＿")) {
    const filled = masked.replace(/[_＿]+/g, t);
    if (answersEquivalent(filled, expected)) return true;

    // Single-character blank — accept the one missing glyph even if typed alone
    const blanks = masked.match(/[_＿]/g) || [];
    if (blanks.length === 1) {
      const idx = masked.search(/[_＿]/);
      const missingChar = expected[idx];
      if (missingChar && answersEquivalent(t, missingChar)) return true;
      // Full idiom typed into a single-cell blank
      if (t.length > 1 && answersEquivalent(t, expected)) return true;
    }
  }

  // Sentence blank (G5): answer is the word that fills ___
  if (masked.includes("___") && answersEquivalent(t, expected)) return true;

  return false;
}
