import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export default function FreePlayPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/materials");
        setMaterials(r.data || []);
      } finally { setLoading(false); }
    })();
    const preId = sessionStorage.getItem("free_play_material_id");
    if (preId) {
      sessionStorage.removeItem("free_play_material_id");
      startPlay(preId);
    }
  }, []);

  const startPlay = async (materialId, mode = "quiz") => {
    setGenerating(materialId);
    sfx.magic();
    try {
      const r = await api.post("/free-play", { material_id: materialId, mode });
      const game = r.data.game;
      sessionStorage.setItem("game", JSON.stringify(game));
      sessionStorage.setItem("mode", "free_play");
      sessionStorage.removeItem("track_id");
      sessionStorage.removeItem("game_unit_ids");
      navigate("/battle");
    } catch (e) {
      console.error(e);
      toast.error(t("fp_fail"));
      setGenerating(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white" data-testid="free-play-page">
      <Particles count={16} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate("/home")} className="text-sky-200/70 hover:text-white text-sm mb-4" data-testid="back-btn">← {t("home_back")}</button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🎲</span>
          <h1 className="font-display text-4xl font-bold">{t("fp_title")}</h1>
        </div>
        <p className="text-sky-100/70 max-w-lg">{t("fp_sub")}</p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="rounded-2xl bg-white/5 h-24 animate-pulse" />)}
          </div>
        ) : materials.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
            <div className="text-5xl mb-3">📚</div>
            <p className="text-sky-100/80">{t("fp_empty")}</p>
            <Button
              data-testid="fp-upload-btn"
              onClick={() => {
                sessionStorage.removeItem("assign_flow");
                sessionStorage.setItem("quick_battle", "1");
                navigate("/upload");
              }}
              className="mt-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold"
            >
              📸 {t("fp_upload")}
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {materials.map((m) => (
              <motion.button
                key={m.material_id}
                data-testid={`fp-material-${m.material_id}`}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startPlay(m.material_id)}
                disabled={!!generating}
                className="rounded-2xl bg-white/10 border border-white/15 hover:border-amber-300 hover:bg-white/15 p-4 text-left transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-2xl">📄</div>
                  {generating === m.material_id ? (
                    <span className="text-xs text-amber-300 animate-pulse">{t("fp_generating")}</span>
                  ) : (
                    <span className="text-xs text-white/50">{t("fp_tap")}</span>
                  )}
                </div>
                <div className="mt-2 font-semibold truncate">{m.title || "Untitled"}</div>
                <div className="text-xs text-white/60 line-clamp-2 mt-1">{(m.text || "").slice(0, 120)}…</div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
