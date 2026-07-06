import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

let app = null;
let auth = null;

function getFirebaseConfig() {
  const raw = process.env.REACT_APP_FIREBASE_CONFIG;
  if (!raw || raw.startsWith("PASTE")) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isFirebaseConfigured() {
  return !!getFirebaseConfig();
}

export function getFirebaseAuth() {
  const config = getFirebaseConfig();
  if (!config) return null;
  if (!app) {
    app = initializeApp(config);
    auth = getAuth(app);
  }
  return auth;
}

export async function signInWithGoogle() {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase not configured — set REACT_APP_FIREBASE_CONFIG in frontend/.env");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(a, provider);
  return result.user.getIdToken();
}
