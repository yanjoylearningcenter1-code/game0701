/** Navigation bridge for push notification deep links (v3 §6.1). */
let _navigate = null;

export function setPushNavigator(navigateFn) {
  _navigate = navigateFn;
}

export function handlePushPayload(data) {
  if (!data || !_navigate) return false;
  const trackId = data.track_id || data.trackId;
  const step = data.step || data.journey_step;
  const kind = data.type || data.kind || "journey";

  if (kind === "journey" && trackId) {
    if (step) sessionStorage.setItem("journey_step", String(step));
    sessionStorage.setItem("track_id", trackId);
    _navigate(`/journey/${trackId}`);
    return true;
  }
  if (kind === "battle" && trackId) {
    sessionStorage.setItem("track_id", trackId);
    sessionStorage.setItem("battle_autoresume", "1");
    _navigate("/battle");
    return true;
  }
  if (kind === "home") {
    _navigate("/home");
    return true;
  }
  return false;
}
