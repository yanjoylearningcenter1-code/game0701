import axios from "axios";
import { shouldSendKidModeHeader } from "@/lib/kidMode";

/** Production fallback when REACT_APP_BACKEND_URL was not set at Vercel build time. */
const PRODUCTION_API = "https://game0701.onrender.com";

function resolveBackendUrl() {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return PRODUCTION_API;
    }
  }
  return "http://127.0.0.1:8000";
}

const BACKEND_URL = resolveBackendUrl();
export { BACKEND_URL };
export const API = `${BACKEND_URL}/api`;

// Per-device kid identity (kid_device_id). Persists in localStorage across sessions.
// Legacy key guest_id is migrated on first read.
export function getKidDeviceId() {
  let id = localStorage.getItem("kid_device_id");
  if (!id) {
    id = localStorage.getItem("guest_id");
  }
  if (!id) {
    id = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  localStorage.setItem("kid_device_id", id);
  localStorage.setItem("guest_id", id);
  return id;
}

/** @deprecated use getKidDeviceId */
export function getGuestId() {
  return getKidDeviceId();
}

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.headers["X-Guest-Id"] = getGuestId();
  if (shouldSendKidModeHeader(window.location.pathname)) {
    config.headers["X-Kid-Mode"] = "true";
  }
  const parentKey = localStorage.getItem("parent_gemini_key");
  if (parentKey?.trim()) {
    config.headers["X-User-Gemini-Key"] = parentKey.trim();
  }
  return config;
});

export default api;
