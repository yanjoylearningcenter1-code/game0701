import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { toast } from "sonner";
import { isConsentRequiredError } from "@/lib/consentErrors";
import { showNoSaveProgressToast } from "@/lib/consentNotice";
import { useLang } from "@/lib/i18n";

const PHASES = [
  "🔍 Reading your material…",
  "🔑 Detecting key concepts…",
  "📚 Building knowledge units…",
  "✨ Forging challenges…",
  "🐉 Boss awakening…",
  "🗺️ Opening the adventure…",
];

export default function TransformationPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [statusLine, setStatusLine] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const dailyBattle = sessionStorage.getItem("daily_battle") === "1";
    const assignFlow = sessionStorage.getItem("assign_flow");
    const text = sessionStorage.getItem("ocr_text") || "";
    const mode = sessionStorage.getItem("mode") || "quiz";
    const exam_date = sessionStorage.getItem("exam_date") || null;
    let trackId = sessionStorage.getItem("track_id") || null;

    if (!dailyBattle && !text.trim()) {
      navigate("/upload", { replace: true });
      return;
    }

    sfx.magic();
    const tick = setInterval(() => setPhaseIdx((p) => Math.min(p + 1, PHASES.length - 1)), 700);
    const startedAt = Date.now();

    (async () => {
      try {
        let game;
        let unitIds = null;

        if (dailyBattle) {
          setStatusLine("Loading today's review…");
          const r = await api.get("/daily-battle");
          game = r.data.game;
          unitIds = r.data.unit_ids || [];
          sessionStorage.setItem("mode", "daily_review");
          sessionStorage.removeItem("track_id");
        } else {
          // Create learning track if we don't have one yet (moved here from
          // ModeSelectionPage so "Begin Transformation" feels instant).
          if (!trackId && text.trim()) {
            setStatusLine("Saving your quest…");
            setPhaseIdx(1);
            try {
              const title = sessionStorage.getItem("material_title") || "Adventure";
              const dueRaw = sessionStorage.getItem("exam_date");
              const assignStudent = sessionStorage.getItem("assign_student_id");
              const assignMulti = sessionStorage.getItem("assign_multi") === "1";
              const trackPayload = {
                text,
                title,
                track_type: mode,
                due_date: mode === "self_practice" ? null : (dueRaw || null),
                is_template: assignFlow === "teacher" || assignMulti,
              };
              if (assignStudent && !assignMulti) trackPayload.student_id = assignStudent;
              const r = await api.post("/tracks", trackPayload);
              trackId = r.data.track.track_id;
              sessionStorage.setItem("track_id", trackId);
              sessionStorage.setItem("is_cram", r.data.is_cram ? "1" : "");
              sessionStorage.setItem("urgency_tier", r.data.urgency_tier || "standard");
              if (r.data.urgency_tier && r.data.urgency_tier !== "standard") {
                const label = r.data.urgency_meta?.label || r.data.urgency_tier;
                toast.info(`${r.data.urgency_meta?.emoji || "⚡"} ${label}`);
              }

              // Parent/teacher assign-only: clone track to students, skip battle.
              if (assignFlow && trackId) {
                try {
                  await api.post("/materials", {
                    title: sessionStorage.getItem("material_title") || "Homework",
                    text,
                    raw_ocr_text: sessionStorage.getItem("raw_ocr_text") || undefined,
                    ocr_confidence: sessionStorage.getItem("ocr_confidence") || undefined,
                  });
                } catch (matErr) {
                  console.warn("material save during assign failed", matErr);
                }

                let assignCount = 0;
                try {
                  const studentIds = JSON.parse(sessionStorage.getItem("assign_student_ids") || "[]");
                  const roomCode = sessionStorage.getItem("assign_room_code") || null;
                  if (studentIds.length || roomCode) {
                    const ar = await api.post(`/tracks/${trackId}/assign`, {
                      student_ids: studentIds,
                      room_code: roomCode,
                    });
                    assignCount = ar.data?.count || 0;
                  } else if (assignStudent) {
                    assignCount = 1;
                  }
                } catch (assignErr) {
                  console.warn("bulk assign failed", assignErr);
                  toast.error(assignErr.response?.data?.detail || "Could not assign to all students");
                }

                const dest = assignFlow === "teacher" ? "/teacher" : "/parent";
                sessionStorage.removeItem("assign_flow");
                sessionStorage.removeItem("assign_student_id");
                sessionStorage.removeItem("assign_student_ids");
                sessionStorage.removeItem("assign_room_code");
                sessionStorage.removeItem("assign_multi");
                sessionStorage.removeItem("track_id");
                sessionStorage.removeItem("ocr_text");
                sessionStorage.removeItem("raw_ocr_text");
                clearInterval(tick);
                toast.success(
                  assignFlow === "parent"
                    ? `Homework assigned to ${assignCount || 1} child(ren)!`
                    : `Assigned to ${assignCount} student(s)! They can play from their home screen.`
                );
                navigate(dest, { replace: true });
                return;
              }
            } catch (err) {
              const consent = isConsentRequiredError(err);
              if (consent) {
                showNoSaveProgressToast(t);
                sessionStorage.removeItem("track_id");
                trackId = null;
                setStatusLine("Playing without saved progress…");
              } else {
                console.warn("track create failed, continuing without track", err);
                sessionStorage.removeItem("track_id");
                trackId = null;
                setStatusLine("Track save skipped — building battle anyway…");
              }
            }
          }

          setStatusLine("Forging your battle…");
          setPhaseIdx(2);

          let ok = false;
          if (trackId) {
            try {
              const journeyTrack = mode === "reading_dictation";
              const r = journeyTrack
                ? await api.post(`/tracks/${trackId}/step-battle`)
                : await api.post(`/tracks/${trackId}/battle`);
              game = r.data.game;
              unitIds = r.data.unit_ids || [];
              if (r.data.journey_step) {
                sessionStorage.setItem("journey_step", String(r.data.journey_step));
              }
              ok = Boolean(game?.challenges?.length);
            } catch (err) {
              if (err.response?.status === 423) {
                clearInterval(tick);
                toast.error(err.response?.data?.detail || "This step is still locked");
                navigate("/home", { replace: true });
                return;
              }
              console.warn("track battle failed, falling back to generate-game", err);
            }
          }

          if (!ok) {
            setStatusLine("Using quick battle generator…");
            const r = await api.post("/generate-game", {
              text,
              mode,
              subject: "general",
              difficulty: 2,
              exam_date,
            });
            game = r.data.game;
            if (!game?.challenges?.length) throw new Error("empty game payload");
          }
        }

        sessionStorage.removeItem("daily_battle");
        sessionStorage.setItem("game", JSON.stringify(game));
        if (unitIds) sessionStorage.setItem("game_unit_ids", JSON.stringify(unitIds));
        else sessionStorage.removeItem("game_unit_ids");

        const minAnimMs = 1200;
        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, minAnimMs - elapsed);
        setTimeout(() => {
          clearInterval(tick);
          navigate("/battle", { replace: true });
        }, wait);
      } catch (e) {
        console.error(e);
        clearInterval(tick);
        sessionStorage.removeItem("daily_battle");

        const offline = !e?.response && (e?.code === "ERR_NETWORK" || e?.message?.includes("Network"));
        if (offline) {
          toast.error("Can't reach the server. Start backend: cd backend && python -m uvicorn server:app --port 8000");
        } else if (dailyBattle) {
          toast.error("Nothing to review right now.");
        } else {
          toast.error("Transformation failed. Check backend is running, then try again.");
        }
        navigate(dailyBattle ? "/home" : "/mode", { replace: true });
      }
    })();

    return () => clearInterval(tick);
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden flex items-center justify-center" data-testid="transform-page">
      <Particles count={40} />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-amber-400/30 blur-3xl animate-glow-pulse" />

      <div className="relative z-10 text-center max-w-md px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="text-7xl mb-8 inline-block drop-shadow-[0_0_24px_rgba(251,191,36,0.7)]"
        >
          📜
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p
            key={phaseIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="font-display text-2xl sm:text-3xl"
          >
            {PHASES[phaseIdx]}
          </motion.p>
        </AnimatePresence>

        {statusLine && (
          <p className="mt-3 text-sm text-sky-200/70" data-testid="transform-status">{statusLine}</p>
        )}

        <div className="mt-8 flex justify-center gap-2">
          {PHASES.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i <= phaseIdx ? "bg-amber-300" : "bg-white/20"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
