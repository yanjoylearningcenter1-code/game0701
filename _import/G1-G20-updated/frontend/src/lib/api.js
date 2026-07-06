import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Per-device guest identity, so anonymous users' knowledge units / tracks /
// memory-strength data don't all collapse into one shared "guest" bucket.
// Persists in localStorage; logged-in users are identified server-side instead.
export function getGuestId() {
  let id = localStorage.getItem("guest_id");
  if (!id) {
    id = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("guest_id", id);
  }
  return id;
}

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  config.headers["X-Guest-Id"] = getGuestId();
  return config;
});

export default api;
