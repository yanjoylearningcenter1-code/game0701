import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export default function FamilyCodePage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/kid-device/family-code");
        setCode(r.data.family_code || "");
      } catch {
        toast.error(t("fc_load_fail"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("fc_copied"));
    } catch {
      toast.error(t("fc_copy_fail"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4" data-testid="family-code-page">
      <div className="max-w-md w-full text-center">
        <h1 className="font-display text-3xl font-bold mb-2">{t("fc_title")}</h1>
        <p className="text-sky-100/70 text-sm mb-8">{t("fc_sub")}</p>
        {loading ? (
          <div className="text-white/50">{t("loading")}</div>
        ) : (
          <div
            className="font-display text-6xl font-black tracking-[0.3em] text-amber-300 mb-8"
            data-testid="family-code-display"
          >
            {code}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Button onClick={copyCode} disabled={!code} className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
            {t("fc_copy")}
          </Button>
          <Button variant="outline" onClick={() => navigate("/identity")} className="rounded-2xl border-white/20 text-white">
            {t("fc_back")}
          </Button>
        </div>
      </div>
    </div>
  );
}
