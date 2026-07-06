import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function ConsentConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, ok: false, message: "" });

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState({ loading: false, ok: false, message: "Missing confirmation token" });
      return;
    }
    (async () => {
      try {
        const r = await api.get(`/consent/confirm?token=${encodeURIComponent(token)}`);
        setState({
          loading: false,
          ok: true,
          message: r.data.message || "Consent confirmed — family link is now active",
        });
      } catch (err) {
        setState({
          loading: false,
          ok: false,
          message: err.response?.data?.detail || "Invalid or expired link",
        });
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4" data-testid="consent-confirm-page">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
        {state.loading ? (
          <p className="text-slate-600">Confirming…</p>
        ) : (
          <>
            <div className="text-5xl mb-4">{state.ok ? "✅" : "❌"}</div>
            <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
              {state.ok ? "Link confirmed" : "Could not confirm"}
            </h1>
            <p className="text-slate-600 mb-6">{state.message}</p>
            {state.ok && (
              <Button onClick={() => navigate("/parent")} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
                Open Parent Dashboard
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
