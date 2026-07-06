/** Kid device flow — separate from parent/teacher login on the same browser. */
const KID_MODE_KEY = "kid_mode";

export function enableKidMode() {
  sessionStorage.setItem(KID_MODE_KEY, "1");
}

export function disableKidMode() {
  sessionStorage.removeItem(KID_MODE_KEY);
}

export function isKidModeActive() {
  if (sessionStorage.getItem("assign_flow")) return false;
  return sessionStorage.getItem(KID_MODE_KEY) === "1";
}

/** Paths that always act as the kid device (even if a parent session cookie exists). */
const KID_PATH_PREFIXES = [
  "/upload", "/preview", "/mode", "/transform", "/battle", "/victory",
  "/home", "/journey", "/profile", "/skills", "/leaderboard", "/settings",
  "/free-play", "/join", "/raid",
];

export function pathUsesKidMode(pathname) {
  if (sessionStorage.getItem("assign_flow")) return false;
  const p = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  return KID_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export function shouldSendKidModeHeader(pathname) {
  return isKidModeActive() || pathUsesKidMode(pathname);
}
