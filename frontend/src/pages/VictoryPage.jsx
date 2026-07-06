import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { resetPlaySession } from "@/lib/playtime";
import { buildVictoryShareText, buildBossCardShareText, shareText } from "@/lib/share";
import { toast } from "sonner";
import api from "@/lib/api";
import { useLang, badgeLabel } from "@/lib/i18n";

export default function VictoryPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const raw = sessionStorage.getItem("battle_result");
  const result = raw ? JSON.parse(raw) : { score: 0, maxCombo: 0, correct: 0, wrong: 0, bossDefeated: false, boss_name: "Boss" };
  const trackId = sessionStorage.getItem("track_id");
  const [startingNext, setStartingNext] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [publicUserId, setPublicUserId] = useState("");

  useEffect(() => {
    api.get("/profile/me").then((r) => setPublicUserId(r.data?.public_user_id || "")).catch(() => {});
  }, []);

  const journey = result.journey || {};
  const stepPassed = journey.passed === true;
  const stepFailed = journey.passed === false;
  const hasJourney = Boolean(trackId && journey.step);
  const justGraduated = journey.graduated === true || journey.status === "completed";

  useEffect(() => {
    if (stepPassed || (!hasJourney && result.bossDefeated)) sfx.victory();
  }, [stepPassed, hasJourney, result.bossDefeated]);

  const stars = stepPassed ? Math.min(3, 1 + (result.maxCombo >= 3 ? 1 : 0) + (result.wrong <= 1 ? 1 : 0)) : 0;

  const canPlayNext = Boolean(
    trackId && stepPassed && journey.status !== "completed" && journey.current_step
  );

  const restartStep = async () => {
    sfx.click();
    setRetrying(true);
    try {
      const step = journey.step || sessionStorage.getItem("journey_step");
      const r = await api.post(`/tracks/${trackId}/step-battle${step ? `?step=${step}` : ""}`);
      sessionStorage.setItem("game", JSON.stringify(r.data.game));
      sessionStorage.setItem("game_unit_ids", JSON.stringify(r.data.unit_ids || []));
      sessionStorage.setItem("journey_step", String(r.data.journey_step || step || 1));
      sessionStorage.setItem("track_id", trackId);
      resetPlaySession();
      navigate("/battle", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || t("journey_start_fail"));
    } finally {
      setRetrying(false);
    }
  };

  const playNextStep = async () => {
    sfx.click();
    setStartingNext(true);
    try {
      const r = await api.post(`/tracks/${trackId}/step-battle`);
      sessionStorage.setItem("game", JSON.stringify(r.data.game));
      sessionStorage.setItem("game_unit_ids", JSON.stringify(r.data.unit_ids || []));
      sessionStorage.setItem("journey_step", String(r.data.journey_step || 1));
      resetPlaySession();
      navigate("/battle", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || t("journey_start_fail"));
      navigate(`/journey/${trackId}`);
    } finally {
      setStartingNext(false);
    }
  };

  const onShare = async () => {
    const r = await shareText(buildVictoryShareText(result, publicUserId));
    if (r === "copied") toast.success(t("leaderboard_copied"));
    else if (r) toast.success(t("leaderboard_shared"));
  };

  const onShareBossCard = async () => {
    const r = await shareText(buildBossCardShareText({
      bossName: result.boss_name,
      score: result.score,
      streak: result.streak?.current_streak,
      publicUserId,
    }));
    if (r === "copied") toast.success(t("leaderboard_copied"));
    else if (r) toast.success(t("leaderboard_shared"));
  };

  const title = justGraduated && stepPassed
    ? t("victory_graduated")
    : stepPassed
      ? t("victory_pass")
      : stepFailed
        ? t("victory_fail")
        : result.bossDefeated
          ? t("victory_complete")
          : t("victory_retry_title");
  const subtitle = justGraduated && stepPassed
    ? t("victory_graduated_sub", { days: journey.boss_followup_days ?? 2 })
    : stepPassed
      ? t("victory_pass_sub", { step: journey.step, pct: journey.accuracy_pct ?? "—" })
      : stepFailed
        ? t("victory_fail_sub", {
            step: journey.step,
            need: journey.pass_threshold_pct ?? "—",
            pct: journey.accuracy_pct ?? "—",
          })
        : result.bossDefeated
          ? t("victory_boss_sub", { boss: result.boss_name || "Boss" })
          : t("victory_retry_sub");

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-amber-900 via-slate-900 to-slate-950 text-white overflow-hidden" data-testid="victory-page">
      <Particles count={40} />

      <button
        type="button"
        data-testid="share-victory-icon"
        onClick={onShare}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg hover:bg-white/20"
        title={t("leaderboard_invite")}
      >
        📤
      </button>
      {result.bossDefeated && (
        <button
          type="button"
          data-testid="share-boss-card-btn"
          onClick={onShareBossCard}
          className="absolute top-4 right-16 z-20 w-10 h-10 rounded-full bg-amber-500/30 border border-amber-300/40 flex items-center justify-center text-lg hover:bg-amber-500/50"
          title={t("share_boss_card")}
        >
          🏆
        </button>
      )}

      <div className="relative z-10 max-w-md mx-auto px-6 py-10 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="text-6xl mb-3"
        >
          {stepPassed ? "🏆" : stepFailed ? "📚" : "⚔️"}
        </motion.div>

        <h1 className="font-display text-3xl font-bold mb-1">{title}</h1>
        <p className="text-sky-100/80 mb-5 text-sm">{subtitle}</p>

        {stepPassed && (
          <div className="flex justify-center gap-2 mb-5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className={`text-3xl ${i < stars ? "text-amber-300" : "text-white/20"}`}
              >
                ★
              </motion.span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl bg-white/10 p-2.5 border border-white/15">
            <div className="text-lg font-bold text-amber-300">{result.score}</div>
            <div className="text-[10px] text-white/50">{t("stat_score")}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-2.5 border border-white/15">
            <div className="text-lg font-bold text-rose-300">x{result.maxCombo}</div>
            <div className="text-[10px] text-white/50">{t("stat_combo")}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-2.5 border border-white/15">
            <div className="text-lg font-bold text-emerald-300">{result.correct}/{result.correct + result.wrong}</div>
            <div className="text-[10px] text-white/50">{t("stat_hits")}</div>
          </div>
        </div>

        {(result.coinsEarned > 0 || result.diamondsEarned > 0) && (
          <div className="mb-5 flex justify-center gap-3 flex-wrap">
            {result.coinsEarned > 0 && (
              <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 flex items-center gap-2" data-testid="coins-earned">
                <span>🪙</span>
                <span className="font-bold text-amber-200">+{result.coinsEarned}</span>
              </div>
            )}
            {result.diamondsEarned > 0 && (
              <div className="rounded-xl bg-cyan-500/20 border border-cyan-400/40 px-3 py-1.5 flex items-center gap-2" data-testid="diamonds-earned">
                <span>💎</span>
                <span className="font-bold text-cyan-200">+{result.diamondsEarned}</span>
              </div>
            )}
          </div>
        )}

        {result.newBadges?.length > 0 && (
          <div className="mb-5 rounded-2xl bg-violet-500/15 border border-violet-400/30 py-2 px-3 text-sm">
            🎖 {result.newBadges.map((id) => badgeLabel(t, id)).join(" · ")}
          </div>
        )}

        <div className="space-y-2 mt-1">
          {hasJourney && (
            <Button
              data-testid="try-again-btn"
              onClick={restartStep}
              disabled={retrying}
              className="w-full rounded-2xl py-4 font-bold bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900"
            >
              {retrying ? t("loading") : `🔄 ${t("try_again")}`}
            </Button>
          )}
          {canPlayNext && (
            <Button
              data-testid="play-next-step-btn"
              onClick={playNextStep}
              disabled={startingNext}
              className="w-full rounded-2xl py-4 font-bold bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-900"
            >
              {startingNext ? t("loading") : `▶ ${t("continue_step", { step: journey.current_step })}`}
            </Button>
          )}
          {trackId && (
            <Button
              data-testid="journey-map-btn"
              variant="outline"
              onClick={() => { sfx.click(); resetPlaySession(); navigate(`/journey/${trackId}`); }}
              className="w-full rounded-2xl py-3 border-white/30 text-white"
            >
              🗺 {t("journey_map")}
            </Button>
          )}
          <Button
            data-testid="home-btn"
            onClick={() => { sfx.click(); resetPlaySession(); navigate("/home"); }}
            variant="outline"
            className="w-full rounded-2xl py-3 border-white/20 text-white/80"
          >
            🏰 {t("home_back")}
          </Button>
        </div>
      </div>
    </div>
  );
}
