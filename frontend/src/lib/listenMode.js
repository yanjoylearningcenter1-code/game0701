const KEY = "listen_mode_default";

/** v3 §2.2 — word-level vs sentence-level audio prompts */
export function getListenMode() {
  return localStorage.getItem(KEY) || "word";
}

export function setListenMode(mode) {
  localStorage.setItem(KEY, mode);
}

export function speakForListenMode(text, mode) {
  const m = mode || getListenMode();
  if (!text) return "";
  if (m === "sentence") return text;
  // word mode: first token / short clip
  const parts = text.trim().split(/\s+/);
  if (parts.length === 1) return text;
  return parts[0];
}
