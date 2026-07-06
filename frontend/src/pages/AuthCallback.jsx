import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    // Firebase popup flow completes on LoginPage — redirect legacy hash URLs to login
    navigate("/login", { replace: true });
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-6" />
        <p className="font-display text-2xl">Redirecting…</p>
      </div>
    </div>
  );
}
