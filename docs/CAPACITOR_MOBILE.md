# Mobile shell (Capacitor) — build & run guide

The app stays a **React web app + FastAPI/MongoDB backend**. Capacitor just wraps the
built web bundle in a native iOS/Android shell so it can be distributed through the
App Store / Play Store, per `docs/FOREVER_NOTES.md`'s "Platform decision" note.

No React Native. No Supabase. The web app, backend, and API contract are unchanged —
only `frontend/` gained `android/`, `ios/`, and `capacitor.config.json`.

## What's already set up

- `capacitor.config.json` — `appId: com.learningjourney.app`, `appName: Learning Journey`, `webDir: build`
- `android/` — native Android Studio project (Gradle, min SDK 24, target/compile SDK 36)
- `ios/` — native Xcode project (workspace at `ios/App/App.xcworkspace`)
- `@capacitor/camera` — native camera capture wired into `UploadPage.jsx` (`captureNativePhoto()`), falls back to the plain HTML `<input capture>` on web
- `@capacitor/push-notifications` — registration wired in `src/lib/push.js`, called once from `App.js`; backend stores tokens at `POST /api/push/register-token` (see `server.py`)
- iOS `Info.plist` — camera + photo library usage descriptions already added (required by App Review)
- Android `AndroidManifest.xml` — `POST_NOTIFICATIONS` permission added (required on Android 13+/API 33+)

## Every time you change frontend code

Capacitor's native shells load a **bundled copy** of `frontend/build/`, not your dev server.
After any frontend change you want to test natively:

```powershell
cd frontend
npm run build
npx cap sync
```

`npx cap sync` copies the new `build/` output into both `android/` and `ios/` and re-links plugins.

### Faster iteration: live-reload against your dev machine

Instead of rebuilding every time, point the native shell at your `npm start` dev server
(phone/emulator and dev machine must be on the same network):

```json
// capacitor.config.json — add temporarily, remove before producing a real build
"server": { "url": "http://YOUR_LAN_IP:3000", "cleartext": true }
```

Then `npx cap sync` once, and reloads on the device happen automatically as you edit code.
**Remove the `server` block before building a release** — production builds must load the
bundled `build/` output, not point at your laptop.

## Android — build & run (works on Windows)

1. Install **Android Studio** (includes the Android SDK + an emulator). This machine does not have it yet.
2. Open the project: Android Studio → *Open* → `frontend/android`
3. Let Gradle sync finish (first sync downloads dependencies, can take a while)
4. Pick a device/emulator → Run ▶
5. Or from the command line once the SDK is installed and `ANDROID_HOME` is set:
   ```powershell
   cd frontend
   npx cap open android   # opens Android Studio
   # or, headless:
   cd android
   .\gradlew.bat assembleDebug
   ```

### Push notifications on Android (Firebase Cloud Messaging)

`@capacitor/push-notifications` uses FCM under the hood. Without a Firebase project configured,
`PushNotifications.register()` will fail silently (the Gradle build itself still succeeds —
`android/app/build.gradle` only applies the `google-services` plugin if `google-services.json` exists).

To enable:
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add an Android app with package name `com.learningjourney.app`
3. Download `google-services.json` → place at `frontend/android/app/google-services.json`
4. `npx cap sync android` again, rebuild

## iOS — build & run (requires a Mac, cannot be done from Windows)

Xcode only runs on macOS — there is no way to build, run, or archive the iOS app from this
Windows machine. The `ios/` project folder is fully generated and ready to hand off to a Mac.

On a Mac, once you have this repo:
```bash
cd frontend
npm install
npm run build
npx cap sync ios
npx cap open ios   # opens ios/App/App.xcworkspace in Xcode
```

Then in Xcode:
1. Select your Apple Developer Team under *Signing & Capabilities*
2. **Add the Push Notifications capability** (Xcode auto-generates the entitlements file and
   registers the App ID) — this step cannot be done outside Xcode
3. Build to a simulator (no Apple Developer account needed) or a real device (needs a free or
   paid Apple ID signing profile)
4. For production APNs delivery, also enable Push Notifications + configure an APNs key/cert
   in your Apple Developer account, and wire it into whatever server-side push sender you build later

`NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` are already set in `Info.plist`,
so App Review won't reject the app for missing camera-permission strings.

## What "push notification support" means right now

The client registers a device token and the backend stores it (`push_tokens` collection,
keyed by `owner` — same identity resolution as everything else, guest or logged-in).
**Actually sending** a push (e.g. a daily "3 words due today" reminder, from
`docs/Learning_Journey_Engine_v3.md` Section 7.2's Daily Task Engine idea) is a separate,
not-yet-built piece: you'd add a Firebase Admin SDK (Android/cross-platform) and/or APNs
integration server-side that reads `push_tokens` + `daily_task_queue`/streak state and sends
messages on a schedule. Flagged in `docs/FOREVER_NOTES.md` as a follow-up, not done this pass.

## App Store review notes (from `docs/Learning_Journey_Engine_v3.md` Section 15.1)

- A pure web-wrapper app draws extra Apple scrutiny under **Guideline 4.2** (minimum functionality).
  Native camera capture + push notifications (both now wired) directly address this — the app
  needs to feel like more than "a website in a box."
  - If you also plan to target Apple's **Kids Category**, expect additional review requirements
  around no third-party analytics/ads and no external links without consent — see Section 15.2
  in the same doc for the consent/compliance gaps still open.
- Auth must not depend on any third-party demo backend — already resolved (Firebase Auth + dev-login,
  see `FOREVER_NOTES.md`).
