import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSETS, Particles } from "@/lib/design";
import { isFirebaseConfigured, signInWithGoogle } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DEV_AUTH_ENV = process.env.REACT_APP_DEV_AUTH === "true";

export default function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const role = sessionStorage.getItem("auth_role") || "parent";
  const [devEmail, setDevEmail] = useState("teacher@test.local");
  const [loading, setLoading] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [devAuthAvailable, setDevAuthAvailable] = useState(DEV_AUTH_ENV);

  useEffect(() => {
    if (DEV_AUTH_ENV || isFirebaseConfigured()) return;
    api.get("/", { timeout: 8000 })
      .then((r) => setDevAuthAvailable(Boolean(r.data?.dev_auth_enabled)))
      .catch(() => setDevAuthAvailable(false));
  }, []);

  const finishLogin = (user) => {
    const dest = user.role === "teacher" ? "/teacher" : "/parent";
    navigate(dest, { replace: true, state: { user } });
  };

  const loginFirebase = async () => {
    if (!agreedPrivacy) {
      toast.error("Please agree to the privacy policy first");
      return;
    }
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const r = await api.post("/auth/session", { id_token: idToken, role });
      await refresh();
      finishLogin(r.data);
    } catch (e) {
      console.error(e);
      toast.error("Login failed — check Firebase config");
    } finally {
      setLoading(false);
    }
  };

  const loginDev = async () => {
    if (!agreedPrivacy) {
      toast.error("Please agree to the privacy policy first");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/auth/dev-login", { email: devEmail, role });
      await refresh();
      finishLogin(r.data);
    } catch (e) {
      toast.error("Dev login failed — enable DEV_AUTH_ENABLED on backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex items-center justify-center" data-testid="login-page">
      <img src={ASSETS.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />
      <div className="absolute inset-0 bg-slate-950/70" />
      <Particles count={16} />

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-2xl text-center">
          <div className="text-4xl mb-2">{role === "teacher" ? "🧙" : "🛡️"}</div>
          <h1 className="font-display text-3xl font-bold mb-2 capitalize">
            {role === "teacher" ? "Teacher Portal" : "Guardian Portal"}
          </h1>
          <p className="text-sky-100/70 text-sm mb-6">
            Sign in to unlock your dashboard, manage materials & view progress.
          </p>

          <label className="flex items-start gap-2 text-left text-xs text-sky-100/80 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              className="mt-0.5 rounded border-white/30"
              data-testid="privacy-agree-checkbox"
            />
            <span>
              I agree to the{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline">
                Privacy Policy
              </a>{" "}
              and Terms of Use.
            </span>
          </label>

          {isFirebaseConfigured() ? (
            <Button
              data-testid="google-login-btn"
              onClick={loginFirebase}
              disabled={loading || !agreedPrivacy}
              className="w-full btn-tactile py-6 text-base font-display font-bold rounded-2xl bg-white text-slate-900 hover:bg-slate-100 shadow-[0_6px_0_rgba(0,0,0,0.2)]"
            >
              Continue with Google
            </Button>
          ) : devAuthAvailable ? (
            <div className="space-y-3">
              <Input
                data-testid="dev-email-input"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="dev@email.local"
                className="rounded-xl bg-white/10 border-white/20 text-white"
              />
              <Button
                data-testid="dev-login-btn"
                onClick={loginDev}
                disabled={loading || !agreedPrivacy}
                className="w-full rounded-2xl py-6 font-display font-bold bg-white text-slate-900"
              >
                Dev Sign In
              </Button>
              <p className="text-xs text-sky-200/50">Local dev mode — set REACT_APP_FIREBASE_CONFIG for production Google login</p>
            </div>
          ) : (
            <p className="text-amber-200 text-sm">
              Configure Firebase (REACT_APP_FIREBASE_CONFIG) on Vercel, or set DEV_AUTH_ENABLED=true on Render for staging login.
            </p>
          )}

          <button
            data-testid="back-identity-btn"
            onClick={() => navigate("/identity")}
            className="mt-6 text-sky-200/60 hover:text-white text-sm"
          >
            ← Choose different role
          </button>
        </div>
      </div>
    </div>
  );
}
