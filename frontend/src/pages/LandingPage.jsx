import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ASSETS, Particles } from "@/lib/design";
import { sfx, unlockAudio } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { enableKidMode } from "@/lib/kidMode";
import { useLang } from "@/lib/i18n";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLang();

  const start = () => {
    unlockAudio();
    sfx.click();
    enableKidMode();
    sessionStorage.removeItem("assign_flow");
    sessionStorage.removeItem("assign_student_id");
    sessionStorage.removeItem("auth_role");
    navigate("/upload");
    // Clear any parent session without blocking kid flow (logout can be slow on cold Render).
    api.post("/auth/logout", null, { timeout: 4000 }).catch(() => {});
  };

  const openFamilyTeacherArea = () => {
    sfx.click();
    navigate("/identity");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white" data-testid="landing-page">
      <img src={ASSETS.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-slate-950/95" />
      <Particles count={36} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-4"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-sm font-bold tracking-wider uppercase">
            {t("landing_tag")}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
        >
          📸 {t("landing_title_1")}<br/>
          <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
            ⚔ {t("landing_title_2")}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-6 text-xl sm:text-2xl text-sky-100/90 font-display"
        >
          {t("landing_sub")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.48 }}
          className="mt-2 text-sm text-amber-200/80 font-medium"
        >
          {t("landing_brand")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-3 max-w-xl text-base text-sky-100/70"
        >
          {t("landing_body")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-10"
        >
          <Button
            data-testid="start-adventure-btn"
            onClick={start}
            className="btn-tactile px-12 py-7 text-xl font-display font-bold uppercase tracking-wider rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-900 shadow-[0_8px_0_rgba(180,83,9,0.8),0_16px_32px_rgba(251,191,36,0.4)] border-b-4 border-amber-700"
          >
            {t("landing_start")}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 text-xs text-sky-100/60"
        >
          <span>⚡ {t("landing_feat_1")}</span>
          <span>🎮 {t("landing_feat_2")}</span>
          <span>🐉 {t("landing_feat_3")}</span>
        </motion.div>
      </div>

      <button
        data-testid="family-teacher-area-btn"
        onClick={openFamilyTeacherArea}
        className="absolute top-4 right-4 z-20 text-xs text-sky-100/50 hover:text-sky-100/90 transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
      >
        👨‍👩‍👧 {t("landing_corner")}
      </button>
    </div>
  );
}
