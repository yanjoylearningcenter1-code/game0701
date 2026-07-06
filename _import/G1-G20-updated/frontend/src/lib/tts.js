// Minimal TTS + text-comparison helpers used by BattlePage.
// Uses browser Web Speech API (available on all modern browsers).

let _voices = null;

function _loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (_voices) return _voices;
  _voices = window.speechSynthesis.getVoices();
  return _voices;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { _voices = window.speechSynthesis.getVoices(); };
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function speak(text, opts = {}) {
  if (!isSpeechSupported() || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.rate = opts.rate ?? 0.9;
    u.pitch = opts.pitch ?? 1.0;
    u.volume = opts.volume ?? 1.0;
    if (opts.lang) u.lang = opts.lang;
    const voices = _loadVoices();
    if (opts.lang && voices.length) {
      const v = voices.find((v) => v.lang?.toLowerCase().startsWith(opts.lang.toLowerCase()));
      if (v) u.voice = v;
    }
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("speak() failed", e);
  }
}

export function stopSpeaking() {
  if (isSpeechSupported()) {
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
  }
}

// Normalise for comparison: lowercase, collapse whitespace, strip trailing punctuation.
export function normalizeAnswer(s) {
  if (s == null) return "";
  return String(s)
    .toLowerCase()
    .replace(/[\s\u3000]+/g, " ")
    .replace(/[.,!?;:'"“”‘’、。！？，；：]+$/g, "")
    .trim();
}

// Levenshtein-based similarity (0..1). Cheap for short strings used here.
export function textSimilarity(a, b) {
  const s = normalizeAnswer(a);
  const t = normalizeAnswer(b);
  if (!s && !t) return 1;
  if (!s || !t) return 0;
  if (s === t) return 1;
  const n = s.length, m = t.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => [i, ...new Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = s[i - 1] === t[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const dist = dp[n][m];
  return 1 - dist / Math.max(n, m);
}

// Threshold used by Full Recall / Dictation games — 0.85 = "mostly correct".
export const FULL_RECALL_PASS_THRESHOLD = 0.85;

// Fill-blank matcher — accepts multiple synonym forms if `answers` is an array,
// else exact-ish match against a single string.
export function matchesFillAnswer(userInput, expected) {
  if (Array.isArray(expected)) return expected.some((e) => matchesFillAnswer(userInput, e));
  return normalizeAnswer(userInput) === normalizeAnswer(expected);
}
