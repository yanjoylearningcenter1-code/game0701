import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ASSETS, Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { disableKidMode, enableKidMode } from "@/lib/kidMode";

// Student is no longer a card here — Kid Mode is the zero-login default
// reached straight from the landing page (v3 Section 13.1/13.2). This screen
// (behind the ParentalGate) only ever offers the two grown-up roles.
const CARDS = [
  {
    id: "parent",
    title: "我是家長",
    subtitle: "Guardian",
    desc: "Plan your child's quests. Track their journey.",
    img: ASSETS.parent,
    aura: "from-emerald-400/60 to-teal-600/60",
    ring: "ring-emerald-300",
  },
  {
    id: "teacher",
    title: "我是老師",
    subtitle: "Magic Mentor",
    desc: "Run classroom raids. Generate room codes.",
    img: ASSETS.teacher,
    aura: "from-violet-400/60 to-fuchsia-600/60",
    ring: "ring-violet-300",
  },
];

export default function IdentitySelectionPage() {
  const navigate = useNavigate();
  const pick = (id) => {
    sfx.click();
    disableKidMode();
    sessionStorage.setItem("identity", id);
    sessionStorage.setItem("auth_role", id);
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white" data-testid="identity-page">
      <img src={ASSETS.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" />
      <div className="absolute inset-0 bg-slate-950/60" />
      <Particles count={24} />

      <div className="relative z-10 min-h-screen px-4 sm:px-8 py-12 flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl sm:text-5xl font-bold text-center"
        >
          Family / Teacher Access
        </motion.h1>
        <p className="mt-3 text-sky-100/70 text-center">Track their journey from here.</p>

        <div className="mt-10 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARDS.map((c, i) => (
            <motion.button
              key={c.id}
              data-testid={`identity-${c.id}-btn`}
              onClick={() => pick(c.id)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`relative group rounded-3xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 p-6 text-left ring-0 hover:ring-4 ${c.ring} transition-all`}
            >
              <div className={`absolute -inset-1 bg-gradient-to-br ${c.aura} opacity-0 group-hover:opacity-60 blur-2xl transition-opacity -z-10`} />
              <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-800/40">
                <img src={c.img} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl font-bold">{c.title}</h3>
                <span className="text-xs uppercase tracking-wider text-amber-200 font-bold">{c.subtitle}</span>
              </div>
              <p className="mt-2 text-sm text-sky-100/80">{c.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-amber-300 font-bold text-sm">
                Enter <span aria-hidden>→</span>
              </div>
            </motion.button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate("/family-code")}
          className="mt-8 w-full rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 py-4 text-sm text-sky-100/80"
          data-testid="show-family-code-btn"
        >
          📱 Show Family Code (on this device)
        </button>

        <button
          data-testid="back-landing-btn"
          onClick={() => {
            enableKidMode();
            sessionStorage.removeItem("assign_flow");
            sessionStorage.removeItem("assign_student_id");
            sessionStorage.removeItem("auth_role");
            navigate("/");
          }}
          className="mt-10 text-sky-200/70 hover:text-white text-sm"
        >
          ← Back to landing
        </button>
      </div>
    </div>
  );
}
