import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "@/lib/api";
import { handlePushPayload } from "@/lib/pushRouter";

// Registers this device for push notifications and hands the FCM/APNs token
// to the backend (POST /push/register-token). No-ops on web — push only
// makes sense inside the Capacitor-wrapped native app. Safe to call multiple
// times; Capacitor dedupes listeners per app lifetime, and the backend
// upserts on (owner, token) so re-registering is harmless.
export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("Push notification permission not granted:", perm.receive);
      return;
    }

    PushNotifications.addListener("registration", async (token) => {
      try {
        await api.post("/push/register-token", {
          token: token.value,
          platform: Capacitor.getPlatform(),
        });
      } catch (e) {
        console.warn("Failed to register push token with backend", e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("Push registration error", err);
    });

    // Foreground notification received while app is open — surfaced via
    // whatever in-app toast system the caller wants; kept as a no-op hook
    // here so callers can extend without touching registration logic.
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received in foreground", notification);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action?.notification?.data || action?.notification?.extra || {};
      handlePushPayload(data);
    });

    await PushNotifications.register();
    await pollDueReminder(true);
  } catch (e) {
    console.warn("initPushNotifications failed", e);
  }
}

/** Poll forgetting-curve reminder; stores payload for in-app banner / deep link. */
export async function pollDueReminder(silent = false) {
  try {
    const { data } = await api.get("/push/due-reminder");
    if (!data?.should_notify) return data;
    if (data.deep_link) {
      sessionStorage.setItem("pending_push_reminder", JSON.stringify(data));
    }
    return data;
  } catch (e) {
    if (!silent) console.warn("pollDueReminder failed", e);
    return null;
  }
}
