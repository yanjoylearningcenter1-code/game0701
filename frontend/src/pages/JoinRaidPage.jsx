import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSETS, Particles } from "@/lib/design";
import api from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export default function JoinRaidPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [name, setName] = useState("Adventurer");

  const join = async () => {
    const room = code.trim().toUpperCase();
    if (room.length < 4) {
      toast.error(t("jr_fail"));
      return;
    }
    try {
      await api.post(`/classrooms/${room}/join`, { display_name: name.trim() || "Student" });
      navigate(`/raid/${room}`);
    } catch {
      toast.error(t("jr_fail"));
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <img src={ASSETS.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      <Particles count={12} />
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-8">
          <h1 className="font-display text-3xl font-bold text-center mb-2">{t("jr_title")}</h1>
          <p className="text-center text-sky-100/70 text-sm mb-6">{t("jr_sub")}</p>
          <Input
            data-testid="join-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("jr_placeholder")}
            className="rounded-xl text-center text-2xl tracking-widest font-bold mb-3"
          />
          <Input
            data-testid="join-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("adventurer")}
            className="rounded-xl mb-4"
          />
          <Button data-testid="join-raid-btn" onClick={join} className="w-full rounded-xl py-6 font-display font-bold bg-violet-600">
            {t("jr_join")}
          </Button>
          <button onClick={() => navigate("/home")} className="mt-4 w-full text-sm text-sky-200/60">← {t("home_back")}</button>
        </div>
      </div>
    </div>
  );
}
