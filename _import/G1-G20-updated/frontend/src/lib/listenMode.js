// Listen Mode — when enabled, some games speak prompts / answers via TTS.
import { speak } from "@/lib/tts";

const KEY = "listen_mode";

export function getListenMode() {
  if (typeof window === "undefined") return "off";
  return localStorage.getItem(KEY) || "off"; // 'off' | 'prompt' | 'auto'
}

export function setListenMode(mode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, mode);
}

export function speakForListenMode(text, mode = null, opts = {}) {
  const m = mode || getListenMode();
  if (m === "off") return;
  speak(text, opts);
}
