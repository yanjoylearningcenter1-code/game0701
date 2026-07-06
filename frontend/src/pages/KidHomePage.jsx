import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ASSETS, Particles, TRACK_TYPE_LABELS } from "@/lib/design";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { sfx } from "@/lib/audio";
import { formatDistanceToNow } from "date-fns";
import { useLang } from "@/lib/i18n";
import { buildBossShareText, buildInviteShareText, shareText } from "@/lib/share";
import ConsentPendingBanner from "@/components/ConsentPendingBanner";
import { toast } from "sonner";
import { KidPageShell } from "@/components/KidBottomNav";
import { continueBattleFromUpload, loadBattleSnapshot } from "@/lib/battleSnapshot";
import { loadProgressSnapshot, continueBattleFromSnapshot } from "@/lib/progressSnapshot";
import { pollDueReminder } from "@/lib/push";
import { handlePushPayload } from "@/lib/pushRouter";
import { enableKidMode } from "@/lib/kidMode";

const REGION_DEFS = [
  { id: "forest", emoji: "🌲", x: 18, y: 70, action: "upload" },
  { id: "plain", emoji: "🌾", x: 38, y: 50, action: "free_play" },
  { id: "abyss", emoji: "🕳️", x: 58, y: 65, action: "boss" },
  { id: "mount", emoji: "⛰️", x: 75, y: 35, action: "journey_quiz" },
  { id: "tower", emoji: "🗼", x: 88, y: 18, action: "journey_exam" },
];

const TIER_STYLE = {
  survival:  { ring: "ring-fuchsia-400", grad: "from-fuchsia-500 to-red-700",  pulse: true },
  emergency: { ring: "ring-rose-400",    grad: "from-rose-500 to-red-700",     pulse: true },
  cram:      { ring: "ring-amber-300",   grad: "from-amber-500 to-orange-600", pulse: false },
  standard:  { ring: "ring-sky-300",     grad: "from-sky-500 to-blue-700",     pulse: false },
};

function getTrackBundleMeta(track, bundleSummary) {
  const rows = (bundleSummary || []).filter((b) => b.track_id === track.track_id);
  const currentBi = Number(track.current_bundle_index ?? 0);
  const current = rows.find((b) => b.is_current)
    || rows.find((b) => b.bundle_index === currentBi)
    || rows[0];
  const next = rows.find((b) => b.bundle_index === currentBi + 1);
  const total = track.bundle_count || (rows.length ? Math.max(...rows.map((r) => r.bundle_total || 0)) : 1);
  return { current, next, currentBi, total: total || 1 };
}

function JourneyTrackCard({ track, bundleSummary, maxStep, accent, onOpen, onDelete }) {
  const { current, next, currentBi, total } = getTrackBundleMeta(track, bundleSummary);
  const step = track.current_step || 1;
  const profileMap = { 1: "L", 2: "L", 3: "L", 4: "L", 5: "R", 6: "R", 7: "R", 8: "R", 9: "R", 10: "E", 11: "E" };

  return (
    <div className={`rounded-2xl bg-black/40 border ${accent.border} p-4 flex items-center justify-between gap-3`}>
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate flex items-center gap-2">
          <span className="truncate">{track.scope_description || track.track_type}</span>
          {onDelete && (
            <button
              type="button"
              data-testid={`delete-track-${track.track_id}`}
              onClick={(e) => { e.stopPropagation(); onDelete(track); }}
              className="shrink-0 text-white/40 hover:text-rose-400 text-sm px-1"
              title="刪除"
            >
              🗑
            </button>
          )}
        </div>
        <div className={`text-xs ${accent.subtext} mt-1`}>
          Step {step}/{maxStep}
          {maxStep <= 10 && ` · Profile ${profileMap[step] || "L"}`}
        </div>
        {current && (
          <div className="text-xs text-white/55 mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
            <span>📦 Bundle {currentBi + 1}/{total}</span>
            <span>· {current.unit_count} units</span>
            <span>· {current.readiness_percent}% ready</span>
            {current.units_due > 0 && (
              <span className="text-rose-300/90">· {current.units_due} due</span>
            )}
          </div>
        )}
        {next && next.units_due > 0 && currentBi + 1 < total && (
          <div className="text-[11px] text-amber-200/70 mt-1">
            Next bundle: {next.unit_count} units · {next.units_due} need review
          </div>
        )}
      </div>
      <Button
        size="sm"
        data-testid={`journey-play-${track.track_id}`}
        onClick={onOpen}
        className={`shrink-0 rounded-xl font-bold ${accent.btn}`}
      >
        🗺 Map
      </Button>
    </div>
  );
}

export default function KidHomePage() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [status, setStatus] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [trackRings, setTrackRings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMonitorInfo, setShowMonitorInfo] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [hasSavedBattle, setHasSavedBattle] = useState(false);
  const [journeyTracks, setJourneyTracks] = useState([]);
  const [recitalTracks, setRecitalTracks] = useState([]);
  const [quizTracks, setQuizTracks] = useState([]);
  const [examTracks, setExamTracks] = useState([]);
  const [dueReminder, setDueReminder] = useState(null);
  const [bundleSummary, setBundleSummary] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const regions = REGION_DEFS.map((r) => ({
    ...r,
    name: t(`region_${r.id}_name`),
    desc: t(`region_${r.id}_desc`),
  }));

  useEffect(() => {
    enableKidMode();
    (async () => {
      const serverSnap = await loadProgressSnapshot().catch(() => null);
      setHasSavedBattle(!!serverSnap || !!loadBattleSnapshot());
    })();
    (async () => {
      try {
        const [s, ss, m, dq, av, tr] = await Promise.allSettled([
          api.get("/home-status"),
          api.get("/game-sessions"),
          api.get("/materials"),
          api.get("/daily-queue"),
          api.get("/profile/avatar"),
          api.get("/tracks"),
        ]);
        if (s.status === "fulfilled") setStatus(s.value.data);
        if (ss.status === "fulfilled") setSessions(ss.value.data || []);
        if (m.status === "fulfilled") setMaterials(m.value.data || []);
        if (dq.status === "fulfilled") {
          setTrackRings(dq.value.data?.track_rings || []);
          setBundleSummary(dq.value.data?.bundle_summary || []);
        }
        if (av.status === "fulfilled") setAvatar(av.value.data);
        if (tr.status === "fulfilled") {
          const all = tr.value.data || [];
          setJourneyTracks(all.filter((t) => t.track_type === "reading_dictation" && !t.is_template));
          setRecitalTracks(all.filter((t) => t.track_type === "recital_dictation" && !t.is_template));
          setQuizTracks(all.filter((t) => t.track_type === "quiz" && !t.is_template));
          setExamTracks(all.filter((t) => t.track_type === "exam" && !t.is_template));
        }
        const pending = sessionStorage.getItem("pending_push_reminder");
        if (pending) {
          try { setDueReminder(JSON.parse(pending)); } catch { /* ignore */ }
        } else {
          const rem = await pollDueReminder(true);
          if (rem?.should_notify) setDueReminder(rem);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const energy = status?.energy || { energy: 100, max_energy: 100, pct: 100, full_refill_at: null };
  const bossStatus = status?.boss_status || { ready: false, units_due: 0, urgency_tier: "standard", urgency_meta: { label: "", emoji: "" } };
  const regionsUnlocked = status?.regions_unlocked || { forest: true };
  const stats = status?.stats || { total_sessions: 0, total_tracks: 0, boss_defeats: 0 };
  const streak = status?.streak || { current_streak: 0, longest_streak: 0 };
  const familyLinkCount = status?.family_link_count || 0;
  const totalScore = sessions.reduce((a, s) => a + (s.score || 0), 0);
  const level = 1 + Math.floor(totalScore / 1000);
  const equippedSkin = avatar?.catalog?.find((s) => s.skin_id === avatar.equipped_skin);
  const diamonds = avatar?.diamonds ?? totalScore;
  const coins = avatar?.coins ?? 0;

  const openDueReminder = () => {
    if (!dueReminder?.deep_link) return;
    sfx.click();
    sessionStorage.removeItem("pending_push_reminder");
    handlePushPayload(dueReminder.deep_link);
    setDueReminder(null);
  };

  const tierStyle = TIER_STYLE[bossStatus.urgency_tier] || TIER_STYLE.standard;

  const startBossBattle = () => {
    if (!bossStatus.ready) return;
    sfx.click();
    sessionStorage.setItem("daily_battle", "1");
    navigate("/transform");
  };

  const startFreePlay = () => { sfx.click(); navigate("/free-play"); };

  const goUpload = () => {
    sfx.click();
    sessionStorage.removeItem("assign_flow");
    sessionStorage.removeItem("assign_student_id");
    sessionStorage.removeItem("quick_battle");
    navigate("/upload");
  };

  const handleRegionClick = (region) => {
    if (!regionsUnlocked[region.id]) {
      toast.info(lang === "en" ? "Complete more quests to unlock this region!" : "完成更多任務才能解鎖這個地區！");
      return;
    }
    sfx.click();
    setSelectedRegion(region);
    if (region.action === "upload") goUpload();
    else if (region.action === "free_play") startFreePlay();
    else if (region.action === "boss") {
      if (bossStatus.ready) startBossBattle();
      else toast.info(lang === "en" ? "No memories due right now — check back later!" : "而家未有到期記憶 — 遲啲再嚟！");
    } else if (region.action === "journey_quiz") {
      const t = quizTracks[0];
      if (t) navigate(`/journey/${t.track_id}`);
      else toast.info(lang === "en" ? "Upload quiz material first!" : "請先上傳測驗教材！");
    } else if (region.action === "journey_exam") {
      const t = examTracks[0];
      if (t) navigate(`/journey/${t.track_id}`);
      else toast.info(lang === "en" ? "Upload exam material first!" : "請先上傳考試教材！");
    }
  };

  const deleteTrack = async (track) => {
    if (!window.confirm(`刪除「${track.scope_description || track.track_type}」？`)) return;
    sfx.click();
    try {
      await api.delete(`/tracks/${track.track_id}`);
      toast.success("已刪除");
      setJourneyTracks((prev) => prev.filter((t) => t.track_id !== track.track_id));
      setRecitalTracks((prev) => prev.filter((t) => t.track_id !== track.track_id));
      setQuizTracks((prev) => prev.filter((t) => t.track_id !== track.track_id));
      setExamTracks((prev) => prev.filter((t) => t.track_id !== track.track_id));
    } catch {
      toast.error("刪除失敗");
    }
  };

  const continueSaved = async () => {
    const snap = await loadProgressSnapshot().catch(() => null) || loadBattleSnapshot();
    if (!snap) {
      toast.info("No saved battle — start a new adventure from Upload!");
      goUpload();
      return;
    }
    if (continueBattleFromSnapshot(snap)) navigate("/battle");
  };

  const shareBoss = async (e) => {
    e.stopPropagation();
    const r = await shareText(buildBossShareText(status));
    if (r === "copied") toast.success("Copied to clipboard");
    else if (r) toast.success("Shared!");
  };

  return (
    <KidPageShell>
    <div className="relative min-h-screen bg-slate-950 text-white" data-testid="home-page">
      <img src={ASSETS.worldMap} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/20 to-slate-950/85" />
      <Particles count={20} />

      {/* Top HUD */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 flex items-center justify-between">
        {showMonitorInfo && (
          <div
            className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 bg-black/60"
            onClick={() => setShowMonitorInfo(false)}
            role="presentation"
          >
            <div
              className="rounded-2xl bg-slate-900 border border-white/20 p-5 text-sm text-sky-100 max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="monitoring-info"
            >
              {familyLinkCount > 1
                ? t("home_monitor_many", { count: familyLinkCount })
                : t("home_monitor_one")}
              <button type="button" className="block mt-3 text-xs text-sky-300 underline" onClick={() => setShowMonitorInfo(false)}>{t("ok")}</button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => { sfx.click(); navigate("/profile"); }}
          className="flex items-center gap-3 rounded-2xl bg-black/40 backdrop-blur px-4 py-2 border border-white/15 hover:border-amber-300/50 transition-colors"
          data-testid="avatar-hud-btn"
          title="View your character profile"
        >
          {equippedSkin ? (
            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl">{equippedSkin.emoji}</span>
          ) : (
            <img src={ASSETS.student} alt="" className="w-10 h-10 rounded-xl object-cover" />
          )}
          <div>
            <div className="font-display font-bold leading-tight">{t("adventurer")}</div>
            <div className="text-xs text-amber-300">{t("level", { n: level })}</div>
          </div>
        </button>
        <div className="flex gap-2 items-center">
          {familyLinkCount > 0 && (
            <button
              type="button"
              data-testid="monitoring-icon"
              onClick={() => setShowMonitorInfo(true)}
              className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-lg"
              title="Family link active"
            >
              👨‍👩‍👧
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-xs text-white/80"
            data-testid="settings-btn"
          >
            ⚙
          </button>
          <button
            type="button"
            onClick={() => { sfx.click(); navigate("/settings"); }}
            className="rounded-2xl bg-amber-400/20 border border-amber-300/40 px-3 py-2 text-xs hover:bg-amber-400/30 transition-colors"
            title={t("diamonds_hint")}
          >
            💎 <span className="font-bold text-amber-200" data-testid="diamonds">{diamonds}</span>
          </button>
          <div className="rounded-2xl bg-yellow-500/20 border border-yellow-400/40 px-3 py-2 text-xs" data-testid="coins-badge" title={t("coins_hint")}>
            🪙 <span className="font-bold text-yellow-200">{coins}</span>
          </div>
          <div className="rounded-2xl bg-orange-500/20 border border-orange-400/40 px-3 py-2 text-xs" data-testid="streak-badge">
            🔥 <span className="font-bold text-orange-200">{streak.current_streak || 0}</span> {t("day_streak")}
          </div>
          <div className="rounded-2xl bg-rose-500/20 border border-rose-400/40 px-3 py-2 text-xs">
            🔥 <span className="font-bold text-rose-200">{stats.boss_defeats}</span> {t("defeats")}
          </div>
        </div>
      </div>

      {dueReminder?.should_notify && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-3">
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={openDueReminder}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-600/40 to-orange-600/40 border border-rose-300/50 p-4 text-left hover:border-rose-200/70 transition-colors"
            data-testid="due-reminder-banner"
          >
            <div className="font-display font-bold text-rose-100 mb-1">{dueReminder.title || "特工召回令 🔔"}</div>
            <p className="text-sm text-white/85">{dueReminder.message}</p>
            <p className="text-xs text-rose-200/80 mt-2">Tap to jump straight to your bundle →</p>
          </motion.button>
        </div>
      )}

      {/* Consolidation Energy — Brain HP */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4">
        <ConsentPendingBanner dataConsent={status?.data_consent} />
        <div className="rounded-3xl bg-black/45 backdrop-blur border border-violet-400/30 p-4" data-testid="energy-panel">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <span className="font-display font-bold text-lg">{t("home_brain_title")}</span>
            </div>
            <span className="text-sm text-violet-200 font-bold" data-testid="energy-value">
              {Math.round(energy.energy)}/{energy.max_energy}
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-900/80 border border-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${energy.pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 hp-bar-fill"
              data-testid="energy-bar"
            />
          </div>
          <p className="text-xs text-violet-200/70 mt-2">
            {energy.pct >= 99
              ? t("home_brain_rested")
              : energy.full_refill_at
                ? t("home_brain_refill", { time: formatDistanceToNow(new Date(energy.full_refill_at)) })
                : t("home_brain_background")}
          </p>
        </div>
      </div>

      {/* Survival / SOS banner */}
      {!loading && (bossStatus.urgency_tier === "survival" || bossStatus.urgency_tier === "emergency") && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4" data-testid="sos-banner">
          <div className={`rounded-3xl border-2 p-4 ${bossStatus.urgency_tier === "survival" ? "bg-fuchsia-950/80 border-fuchsia-400" : "bg-rose-950/70 border-rose-400"}`}>
            <div className="font-display text-xl font-bold">
              {bossStatus.urgency_tier === "survival" ? "🆘 SOS — exam very soon!" : "⚡ Emergency review"}
            </div>
            <p className="text-sm text-white/85 mt-1">
              Focus on the {bossStatus.units_due} most urgent items. Skip free play — boss battle only.
            </p>
            <Button
              onClick={startBossBattle}
              className="mt-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-white/90"
              data-testid="sos-start-btn"
            >
              Start SOS battle now
            </Button>
          </div>
        </div>
      )}

      {/* Boss Status — the real Core Loop CTA */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="rounded-3xl bg-black/40 border border-white/10 p-6 h-32 animate-pulse" />
        ) : bossStatus.ready ? (
          <motion.button
            data-testid="boss-ready-card"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startBossBattle}
            className={`w-full text-left rounded-3xl bg-gradient-to-br ${tierStyle.grad} border-2 ${tierStyle.ring} p-5 shadow-2xl ${tierStyle.pulse ? "animate-glow-pulse" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/85 font-bold">
                  {bossStatus.urgency_meta?.emoji} {bossStatus.urgency_meta?.label}
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold mt-1">
                  🐉 {t("home_boss_awakened")}
                </div>
                <div className="text-sm text-white/90 mt-1">
                  <span className="font-bold" data-testid="units-due-count">{bossStatus.units_due}</span> memories need a top-up right now
                </div>
              </div>
              <div className="text-5xl">⚔</div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm bg-black/25 rounded-full px-3 py-1 font-bold">
                {t("home_start_battle")}
              </span>
              <button
                type="button"
                onClick={shareBoss}
                className="text-sm bg-black/25 rounded-full px-3 py-1 hover:bg-black/40"
                data-testid="share-boss-btn"
              >
                📤 Share
              </button>
            </div>
          </motion.button>
        ) : (
          <div className="rounded-3xl bg-slate-900/60 backdrop-blur border border-sky-400/20 p-5" data-testid="boss-resting-card">
            <div className="flex items-center gap-3">
              <span className="text-4xl">😴</span>
              <div className="flex-1">
                <div className="font-display text-xl font-bold">{t("home_boss_resting")}</div>
                <p className="text-sm text-sky-100/70 mt-1">
                  {t("home_boss_resting_body")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reading dictation journey steps (G1→G9) */}
      {journeyTracks.length > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4" data-testid="journey-tracks">
          <h2 className="font-display text-lg font-bold mb-2">📖 {t("home_reading_journey")}</h2>
          <div className="space-y-2">
            {journeyTracks.slice(0, 4).map((t) => (
              <JourneyTrackCard
                key={t.track_id}
                track={t}
                bundleSummary={bundleSummary}
                maxStep={10}
                accent={{
                  border: "border-amber-400/20",
                  subtext: "text-amber-200/80",
                  btn: "bg-amber-500 hover:bg-amber-600 text-slate-900",
                }}
                onOpen={() => { sfx.click(); navigate(`/journey/${t.track_id}`); }}
                onDelete={deleteTrack}
              />
            ))}
          </div>
        </div>
      )}

      {recitalTracks.length > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4" data-testid="recital-journey-tracks">
          <h2 className="font-display text-lg font-bold mb-2">🗡️ {t("home_recital_journey")}</h2>
          <div className="space-y-2">
            {recitalTracks.slice(0, 4).map((t) => (
              <JourneyTrackCard
                key={t.track_id}
                track={t}
                bundleSummary={bundleSummary}
                maxStep={10}
                accent={{
                  border: "border-violet-400/20",
                  subtext: "text-violet-200/80",
                  btn: "bg-violet-500 hover:bg-violet-600 text-white",
                }}
                onOpen={() => { sfx.click(); navigate(`/journey/${t.track_id}`); }}
                onDelete={deleteTrack}
              />
            ))}
          </div>
        </div>
      )}

      {quizTracks.length > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4" data-testid="quiz-journey-tracks">
          <h2 className="font-display text-lg font-bold mb-2">⚡ {t("home_quiz_journey")}</h2>
          <div className="space-y-2">
            {quizTracks.slice(0, 4).map((t) => (
              <JourneyTrackCard
                key={t.track_id}
                track={t}
                bundleSummary={bundleSummary}
                maxStep={11}
                accent={{
                  border: "border-sky-400/20",
                  subtext: "text-sky-200/80",
                  btn: "bg-sky-500 hover:bg-sky-600 text-white",
                }}
                onOpen={() => { sfx.click(); navigate(`/journey/${t.track_id}`); }}
                onDelete={deleteTrack}
              />
            ))}
          </div>
        </div>
      )}

      {examTracks.length > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4" data-testid="exam-journey-tracks">
          <h2 className="font-display text-lg font-bold mb-2">🏆 {t("home_exam_journey")}</h2>
          <div className="space-y-2">
            {examTracks.slice(0, 4).map((t) => (
              <JourneyTrackCard
                key={t.track_id}
                track={t}
                bundleSummary={bundleSummary}
                maxStep={11}
                accent={{
                  border: "border-rose-400/20",
                  subtext: "text-rose-200/80",
                  btn: "bg-rose-500 hover:bg-rose-600 text-white",
                }}
                onOpen={() => { sfx.click(); navigate(`/journey/${t.track_id}`); }}
                onDelete={deleteTrack}
              />
            ))}
          </div>
        </div>
      )}

      {/* Per-track readiness rings */}
      {trackRings.length > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4" data-testid="track-rings">
          <h2 className="font-display text-lg font-bold mb-2">📊 {t("home_today_tracks")}</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {trackRings.map((t) => (
              <div key={t.track_id} className="min-w-[140px] rounded-2xl bg-black/40 border border-white/10 p-3 text-center">
                <div className="text-xs text-white/60 mb-1 truncate">
                  {TRACK_TYPE_LABELS[t.track_type] || t.track_type}
                </div>
                <div className="relative w-16 h-16 mx-auto">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke="rgb(251,191,36)" strokeWidth="3"
                      strokeDasharray={`${t.readiness_percent} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-amber-200">
                    {Math.round(t.readiness_percent)}%
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1">{t.units_due} due</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* World Map */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 mt-6">
        <h2 className="font-display text-2xl font-bold drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">🌍 {t("home_world_map")}</h2>
        <p className="text-sky-100/70 text-xs mt-1">{t("home_world_map_sub")}</p>
        <div className="mt-3 relative aspect-[16/9] rounded-3xl bg-black/30 backdrop-blur border border-white/15 overflow-hidden">
          {regions.map((r, i) => {
            const unlocked = regionsUnlocked[r.id];
            return (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.08, type: "spring" }}
                whileHover={unlocked ? { scale: 1.15 } : undefined}
                onClick={() => handleRegionClick(r)}
                data-testid={`region-${r.id}`}
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition ${unlocked ? "" : "opacity-40 cursor-not-allowed grayscale"}`}
              >
                <span className="text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] relative">
                  {r.emoji}
                  {!unlocked && (
                    <span className="absolute -bottom-1 -right-1 text-base">🔒</span>
                  )}
                </span>
                <span className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full bg-black/60">{r.name}</span>
              </motion.button>
            );
          })}
        </div>
        {(selectedRegion || regions[0]) && (
          <div className="mt-3 rounded-2xl bg-black/50 border border-white/10 p-3 text-sm text-sky-100/85">
            <div className="font-bold">
              {(selectedRegion || regions[0]).emoji} {(selectedRegion || regions[0]).name}
            </div>
            <p className="text-xs mt-1 text-white/60">
              {(selectedRegion || regions[0]).desc}
            </p>
            <p className="text-[10px] text-white/40 mt-2">
              {t("home_region_tap")}
            </p>
          </div>
        )}
      </div>

      {/* Join classroom raid */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 mt-6">
        <Button
          data-testid="join-raid-btn"
          onClick={() => { sfx.click(); navigate("/join"); }}
          className="w-full rounded-2xl py-6 font-display font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg"
        >
          🏫 {t("home_join_raid")}
        </Button>
      </div>

      {/* Free Play — Side Loop */}
      {materials.length > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-bold">🎲 {t("home_free_play")}</h2>
            <span className="text-xs text-sky-100/60">{t("home_free_play_sub")}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {materials.slice(0, 10).map((m) => (
              <button
                key={m.material_id}
                data-testid={`free-play-mat-${m.material_id}`}
                onClick={() => {
                  sfx.click();
                  sessionStorage.setItem("free_play_material_id", m.material_id);
                  sessionStorage.setItem("free_play_title", m.title);
                  navigate("/free-play");
                }}
                className="min-w-[180px] rounded-2xl bg-white/10 border border-white/15 hover:border-amber-300 hover:bg-white/15 p-3 text-left transition-all"
              >
                <div className="text-2xl mb-1">📄</div>
                <div className="font-semibold text-sm truncate">{m.title || "Untitled"}</div>
                <div className="text-xs text-white/50 line-clamp-2 mt-1">{(m.text || "").slice(0, 60)}…</div>
              </button>
            ))}
            <button
              onClick={startFreePlay}
              data-testid="free-play-more-btn"
              className="min-w-[140px] rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-300 hover:bg-white/5 p-3 text-center flex flex-col items-center justify-center transition-all"
            >
              <span className="text-3xl">➕</span>
              <span className="text-xs text-white/70 mt-1">See all</span>
            </button>
          </div>
        </div>
      )}

      {/* Recent quests */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 mt-6">
        <h2 className="font-display text-xl font-bold mb-3">📜 {t("home_recent_quests")}</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {sessions.length === 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/60">{t("home_recent_quests_empty")}</div>
          )}
          {sessions.slice(0, 8).map((s) => (
            <div key={s.session_id || s.completed_at} className="min-w-[160px] rounded-2xl bg-white/10 border border-white/15 p-3 text-sm">
              <div className="text-amber-300 font-bold">{s.score} pts</div>
              <div className="text-xs text-white/70 uppercase tracking-wider mt-1">{s.mode}</div>
              <div className="text-xs text-white/50">{s.correct}/{(s.correct||0)+(s.wrong||0)} hits</div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional continue — no nag if nothing saved */}
      {hasSavedBattle && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 mt-4">
          <button
            type="button"
            data-testid="home-continue-btn"
            onClick={continueSaved}
            className="w-full rounded-2xl bg-amber-500/15 border border-amber-400/30 py-3 text-sm font-bold text-amber-100 hover:bg-amber-500/25 transition-colors"
          >
            🔁 {t("home_continue_saved")}
          </button>
        </div>
      )}

      <div className="h-4" />
    </div>
    </KidPageShell>
  );
}

