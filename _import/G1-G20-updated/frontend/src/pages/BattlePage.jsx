import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ASSETS } from "@/lib/design";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/audio";
import api from "@/lib/api";
import { speak, stopSpeaking, isSpeechSupported, normalizeAnswer, textSimilarity, FULL_RECALL_PASS_THRESHOLD, matchesFillAnswer } from "@/lib/tts";
import { getListenMode, setListenMode, speakForListenMode } from "@/lib/listenMode";
import { startOrContinuePlaySession, shouldSuggestBreak, snoozePlaySession, resetPlaySession } from "@/lib/playtime";
import StrokeOrderTeach from "@/components/StrokeOrderTeach";
import SlashGame from "@/components/games/SlashGame";
import SpeedGridGame from "@/components/games/SpeedGridGame";
import RescueGame from "@/components/games/RescueGame";
import BubblePopGame from "@/components/games/BubblePopGame";
import MemoryWriteGame from "@/components/games/MemoryWriteGame";
import MemoryFlipGame from "@/components/games/MemoryFlipGame";
import TapChoiceGame from "@/components/games/TapChoiceGame";
import FillBlankGame from "@/components/games/FillBlankGame";
import UnscrambleGame from "@/components/games/UnscrambleGame";
import WordDetectiveGame from "@/components/games/WordDetectiveGame";
import TargetWordHuntGame from "@/components/games/TargetWordHuntGame";
import LogicOrderGame from "@/components/games/LogicOrderGame";
import FlashCardReadGame from "@/components/games/FlashCardReadGame";
import ClozeFillGame from "@/components/games/ClozeFillGame";
import DictationGame from "@/components/games/DictationGame";
import SentenceMakingGame from "@/components/games/SentenceMakingGame";
import FullRecallGame from "@/components/games/FullRecallGame";
import { saveProgressSnapshot, loadProgressSnapshot, clearProgressSnapshot } from "@/lib/progressSnapshot";
import { useLang } from "@/lib/i18n";
import { themeForJourneyGame } from "@/lib/stepThemes";
import { getDiamonds, addDiamonds, spendDiamonds } from "@/lib/diamonds";
import StreakSaveModal from "@/components/StreakSaveModal";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const COMBO_HYPER_THRESHOLD = 5;
const STREAK_SAVE_THRESHOLD = 3; // require x3+ combo to be worth spending 💎

export default function BattlePage({ raidRoomCode = null }) {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [game, setGame] = useState(null);
  const [deck, setDeck] = useState(null);
  const [idx, setIdx] = useState(0);
  const missedRef = useRef([]);
  const remixDoneRef = useRef(false);
  const initialDeckSizeRef = useRef(null);
  const sessionFinishedRef = useRef(false);
  const gameStatsRef = useRef({});
  const totalReplayRef = useRef(0);
  const totalPeekRef = useRef(0);
  const challengeStartRef = useRef(Date.now());
  const firstInputRef = useRef(null);
  const challengeReplayRef = useRef(0);
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [bossShake, setBossShake] = useState(false);
  const [flashShown, setFlashShown] = useState(true);
  const [dragOrder, setDragOrder] = useState([]);
  const [dragPool, setDragPool] = useState([]);
  const [comboPopup, setComboPopup] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  // Streak Save — spend 1 💎 to keep combo intact when about to miss.
  const [diamonds, setDiamondsState] = useState(getDiamonds());
  const [streakSaveOpen, setStreakSaveOpen] = useState(false);
  const streakSavedThisChallengeRef = useRef(false);
  const streakSaveOfferedRef = useRef(false);
  const [sentenceGradeFeedback, setSentenceGradeFeedback] = useState(null);
  const [gradingSentence, setGradingSentence] = useState(false);
  const [similarityResult, setSimilarityResult] = useState(null);
  const [showStrokeTeach, setShowStrokeTeach] = useState(false);
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);
  const [isRemixLoop, setIsRemixLoop] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingResume, setPendingResume] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [peekFlash, setPeekFlash] = useState(null);
  const [peekCount, setPeekCount] = useState(0);
  const [replayCount, setReplayCount] = useState(0);
  const [highlightSelected, setHighlightSelected] = useState(new Set());
  const [readAlongReady, setReadAlongReady] = useState(false);
  const [listenMode, setListenModeState] = useState(() => getListenMode());
  const [hyperBurst, setHyperBurst] = useState(false);
  const prevComboRef = useRef(0);

  useEffect(() => {
    api.get("/student-preferences").then((r) => {
      const m = r.data?.listen_mode_default;
      if (m) { setListenMode(m); setListenModeState(m); }
    }).catch(() => {});
  }, []);

  const speakChallenge = (text) => {
    const mode = challenge?.listen_mode || listenMode;
    speak(speakForListenMode(text, mode));
  };

  const toggleListenMode = () => {
    const next = listenMode === "word" ? "sentence" : "word";
    setListenMode(next);
    setListenModeState(next);
    api.post("/student-preferences", { listen_mode_default: next }).catch(() => {});
    sfx.click();
  };

  const loadFreshGame = () => {
    const raw = sessionStorage.getItem("game");
    if (!raw) {
      navigate("/upload", { replace: true });
      return;
    }
    const g = JSON.parse(raw);
    setGame(g);
    const challenges = g.challenges || [];
    initialDeckSizeRef.current = challenges.length;
    sessionFinishedRef.current = false;
    setDeck(challenges);
    setIdx(0);
    setBossHp(g.boss_max_hp || 100);
    setPlayerHp(100);
    setCombo(0);
    setScore(0);
    setMaxCombo(0);
    setCorrect(0);
    setWrong(0);
    setFeedback(null);
    setIsRemixLoop(false);
    missedRef.current = [];
    remixDoneRef.current = false;
    gameStatsRef.current = {};
    startOrContinuePlaySession();
    if (shouldSuggestBreak()) setShowBreakPrompt(true);
  };

  const resumeFromSnapshotDirect = (s) => {
    setGame(s.game);
    setDeck(s.deck);
    initialDeckSizeRef.current = (s.game?.challenges || s.deck || []).length;
    sessionFinishedRef.current = false;
    setIdx(s.idx || 0);
    setBossHp(s.bossHp ?? (s.game?.boss_max_hp || 100));
    setPlayerHp(s.playerHp ?? 100);
    setCombo(s.combo || 0);
    setScore(s.score || 0);
    setMaxCombo(s.maxCombo || 0);
    setCorrect(s.correct || 0);
    setWrong(s.wrong || 0);
    setIsRemixLoop(!!s.isRemixLoop);
    missedRef.current = s.missed || [];
    remixDoneRef.current = !!s.remixDone;
    clearProgressSnapshot();
    setShowResumePrompt(false);
    startOrContinuePlaySession();
  };

  useEffect(() => {
    const autoResume = sessionStorage.getItem("battle_autoresume") === "1";
    if (autoResume) sessionStorage.removeItem("battle_autoresume");

    (async () => {
      const snap = raidRoomCode ? null : await loadProgressSnapshot();
      if (snap && autoResume) {
        setPendingResume(snap);
        resumeFromSnapshotDirect(snap);
        return;
      }
      if (snap) {
        setPendingResume(snap);
        setShowResumePrompt(true);
        return;
      }
      loadFreshGame();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const resumeFromSnapshot = () => {
    if (!pendingResume) return;
    sfx.click();
    resumeFromSnapshotDirect(pendingResume);
  };

  const discardResumeAndStartFresh = () => {
    sfx.click();
    clearProgressSnapshot();
    setShowResumePrompt(false);
    loadFreshGame();
  };

  const openExitConfirm = () => {
    sfx.click();
    setShowExitConfirm(true);
  };

  const confirmExitAndSave = async () => {
    sfx.click();
    await saveProgressSnapshot({
      game, deck, idx, bossHp, playerHp, combo, score, maxCombo, correct, wrong,
      isRemixLoop, missed: missedRef.current, remixDone: remixDoneRef.current,
    });
    resetPlaySession();
    setShowExitConfirm(false);
    navigate("/home");
  };

  const challenge = deck?.[idx] || null;
  const maxBoss = game?.boss_max_hp || 100;
  const maxPlayer = 100;

  // Reset state per challenge
  useEffect(() => {
    if (!challenge) return;
    setFeedback(null);
    setTypedAnswer("");
    setSimilarityResult(null);
    setPeekCount(0);
    setPeekFlash(null);
    setReplayCount(0);
    setSentenceGradeFeedback(null);
    challengeStartRef.current = Date.now();
    firstInputRef.current = null;
    challengeReplayRef.current = 0;
    // Timers: slash, speed_grid, rescue, and timed typing manage their own clocks.
    const timedTyping = challenge.type === "typing" && challenge.time_limit_sec;
    if (challenge.type === "rescue" || challenge.type === "slash" || challenge.type === "speed_grid" || timedTyping) {
      setTimeLeft(null);
    } else {
      setTimeLeft(challenge.time_limit_sec || null);
    }
    if (challenge.type === "drag") {
      setDragPool(shuffle(challenge.tiles || []));
      setDragOrder([]);
    } else if (challenge.type === "memory_flash") {
      setFlashShown(true);
      const t = setTimeout(() => setFlashShown(false), 1800);
      return () => clearTimeout(t);
    } else if (challenge.type === "typing" || challenge.type === "full_recall") {
      const t = setTimeout(() => speakChallenge(challenge.answer), 400);
      return () => { clearTimeout(t); stopSpeaking(); };
    } else if (challenge.type === "missing_letter") {
      const t = setTimeout(() => { if (challenge.auto_play_audio !== false) speakChallenge(challenge.answer); }, 400);
      return () => { clearTimeout(t); stopSpeaking(); };
    } else if (challenge.auto_play_audio) {
      // Audio-first games (bubble pop, memory/synonym match, flashcard, word
      // detective, slash) all rely on hearing the word before acting —
      // covers G1/G2/G7/G12/G16/G19 which previously never spoke at all.
      const t = setTimeout(() => speakChallenge(challenge.answer), 400);
      return () => { clearTimeout(t); stopSpeaking(); };
    }
    setHighlightSelected(new Set());
    setReadAlongReady(false);
    if (challenge.type === "read_along") {
      const t = setTimeout(() => speak(challenge.passage || challenge.answer), 500);
      return () => { clearTimeout(t); stopSpeaking(); };
    }
  }, [idx, challenge]);

  // Per-challenge countdown (typing / dictation — slash/speed_grid/rescue use own timers)
  useEffect(() => {
    if (!challenge?.time_limit_sec) return undefined;
    if (challenge.type === "slash" || challenge.type === "speed_grid" || challenge.type === "rescue") {
      return undefined;
    }
    if (challenge.type === "typing" && challenge.time_limit_sec) {
      return undefined;
    }
    setTimeLeft(challenge.time_limit_sec);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(id);
          if (!sessionFinishedRef.current) onWrong();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, challenge?.time_limit_sec, challenge?.type]);

  const progressPct = deck?.length
    ? ((idx + 1) / (initialDeckSizeRef.current || deck.length)) * 100
    : 0;
  const isHyperMode = combo >= COMBO_HYPER_THRESHOLD;

  useEffect(() => {
    const wasHyper = prevComboRef.current >= COMBO_HYPER_THRESHOLD;
    if (isHyperMode && !wasHyper) {
      setHyperBurst(true);
      sfx.combo?.(COMBO_HYPER_THRESHOLD);
      const t = setTimeout(() => setHyperBurst(false), 1200);
      prevComboRef.current = combo;
      return () => clearTimeout(t);
    }
    prevComboRef.current = combo;
    return undefined;
  }, [combo, isHyperMode]);

  const audioProfile = game?.audio_profile || challenge?.audio_profile || "L";
  const peekDisabled = game?.peek_disabled || challenge?.peek_disabled;
  const peekLimit = peekDisabled ? 0 : (
    challenge?.peek_limit != null
      ? challenge.peek_limit
      : (audioProfile === "E" ? 0 : 5)
  );
  const replayLimit = challenge?.replay_limit ?? (audioProfile === "L" ? null : audioProfile === "R" ? 2 : 1);

  const handlePeekHint = () => {
    if (peekDisabled || peekCount >= peekLimit) return;
    sfx.click();
    totalPeekRef.current += 1;
    setPeekCount((c) => c + 1);
    setPeekFlash(challenge.answer);
    setTimeout(() => setPeekFlash(null), 1500);
  };

  if (showResumePrompt) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }}
          className="max-w-sm w-full rounded-3xl bg-slate-900 border border-amber-400/30 p-6 text-center space-y-4"
          data-testid="resume-prompt"
        >
          <div className="text-5xl">🔁</div>
          <h3 className="font-display text-xl font-bold">{t("upload_resume_title")}</h3>
          <p className="text-sm text-sky-100/70">
            {t("upload_resume_body")}
          </p>
          <div className="space-y-2">
            <Button
              data-testid="resume-battle-btn"
              onClick={resumeFromSnapshot}
              className="w-full rounded-2xl py-5 font-display font-bold bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-900"
            >
              ▶️ {t("upload_continue")}
            </Button>
            <Button
              data-testid="discard-resume-btn"
              onClick={discardResumeAndStartFresh}
              variant="outline"
              className="w-full rounded-2xl py-5 font-display font-bold border-white/20 text-white hover:bg-white/10"
            >
              ✨ {t("upload_start_new")}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!game || !deck || !challenge) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">{t("battle_loading")}</div>;
  }

  const recordReview = (isCorrect) => {
    const response_time_ms = Date.now() - challengeStartRef.current;
    // full_recall covers every sentence unit in the passage at once — log a
    // review for each so the forgetting-curve engine updates all of them,
    // not just the single "primary" unit_id the challenge is keyed on.
    const coveredIds = challenge?.answer_unit_ids?.length ? challenge.answer_unit_ids : (challenge?.unit_id ? [challenge.unit_id] : []);
    if (!coveredIds.length) return; // quick-battle / non-track game: nothing to log
    coveredIds.forEach((unit_id) => {
      api.post("/reviews", { unit_id, correct: isCorrect, response_time_ms })
        .catch((err) => console.warn("recordReview failed", err));
    });
  };

  const recordBehavioralSignal = (isCorrect) => {
    if (!challenge?.unit_id) return;
    const now = Date.now();
    const reaction = (firstInputRef.current || now) - challengeStartRef.current;
    const processing = firstInputRef.current ? now - firstInputRef.current : reaction;
    api.post("/behavioral-signals", {
      unit_id: challenge.unit_id,
      track_id: sessionStorage.getItem("track_id") || null,
      game_type: challenge.game_type,
      reaction_time_ms: reaction,
      processing_time_ms: processing,
      replay_count: challengeReplayRef.current,
      hint_usage: peekCount,
      correct: isCorrect,
    }).catch(() => {});
  };

  const recordGameStat = (isCorrect) => {
    const gt = challenge?.game_type || "unknown";
    if (!gameStatsRef.current[gt]) gameStatsRef.current[gt] = { correct: 0, wrong: 0 };
    gameStatsRef.current[gt][isCorrect ? "correct" : "wrong"] += 1;
  };

  const finishSession = async (opts = {}) => {
    if (sessionFinishedRef.current) return;
    sessionFinishedRef.current = true;
    const finalCorrect = opts.correct ?? correct;
    const finalWrong = opts.wrong ?? wrong;
    const finalScore = opts.score ?? score;
    const finalMaxCombo = opts.maxCombo ?? maxCombo;
    const totalQ = initialDeckSizeRef.current || deck?.length || 1;
    const completedRun = (finalCorrect + finalWrong) >= totalQ;
    const defeated = opts.bossDefeated ?? (bossHp <= 0 || completedRun);
    let streakInfo = null;
    let diamondsEarned = 0;
    let coinsEarned = 0;
    let newBadges = [];
    let journeyResult = null;
    try {
      const unitIdsRaw = sessionStorage.getItem("game_unit_ids");
      const unit_ids = unitIdsRaw ? JSON.parse(unitIdsRaw) : [];
      const journeyStep = sessionStorage.getItem("journey_step");
      const r = await api.post("/game-sessions", {
        mode: sessionStorage.getItem("mode") || "quiz",
        track_id: sessionStorage.getItem("track_id") || null,
        score: finalScore, max_combo: finalMaxCombo, correct: finalCorrect, wrong: finalWrong, unit_ids,
        boss_defeated: defeated,
        journey_step: journeyStep ? parseInt(journeyStep, 10) : null,
        game_breakdown: gameStatsRef.current,
        replay_count: totalReplayRef.current,
        peek_count: totalPeekRef.current,
      });
      streakInfo = r.data?.streak;
      diamondsEarned = r.data?.diamonds_earned || 0;
      journeyResult = r.data?.journey || null;
      coinsEarned = r.data?.coins_earned || 0;
      newBadges = r.data?.new_badges || [];
    } catch (err) {
      console.warn("game-session save failed", err);
    }
    clearProgressSnapshot();
    sessionStorage.removeItem("journey_step");
    sessionStorage.setItem("battle_result", JSON.stringify({
      score: finalScore, maxCombo: finalMaxCombo, correct: finalCorrect, wrong: finalWrong, bossDefeated: defeated, boss_name: game.boss_name, title: game.title,
      streak: streakInfo, diamondsEarned, coinsEarned, newBadges, journey: journeyResult,
    }));
    navigate("/victory", { replace: true });
  };

  // Session ends only when the deck (plus one remix loop) is exhausted.
  const advance = () => {
    // Reset streak-save offer state per challenge — kid can use 💎 rescue
    // once per challenge, but the offer resets on each new question.
    streakSaveOfferedRef.current = false;
    streakSavedThisChallengeRef.current = false;
    if (idx + 1 < deck.length) {
      setIdx(idx + 1);
      return;
    }
    if (!remixDoneRef.current && missedRef.current.length > 0 && !game?.single_pass) {
      remixDoneRef.current = true;
      setIsRemixLoop(true);
      setCombo(0);
      setComboPopup(null);
      setDeck(missedRef.current);
      missedRef.current = [];
      setIdx(0);
      return;
    }
    finishSession();
  };

  const onCorrect = () => {
    if (sessionFinishedRef.current || feedback) return;
    sfx.correct();
    recordGameStat(true);
    recordReview(true);
    recordBehavioralSignal(true);
    const newCombo = combo + 1;
    if (newCombo >= 2) sfx.combo(newCombo);
    // Boss HP scales 1:1 with the original deck — combo boosts score only, not boss damage.
    const totalQ = initialDeckSizeRef.current || deck?.length || 1;
    const perQ = Math.ceil(maxBoss / Math.max(1, totalQ));
    const dmg = perQ;
    const newBoss = Math.max(0, bossHp - dmg);
    const hyperMultiplier = newCombo >= COMBO_HYPER_THRESHOLD ? 2 : 1;
    const gained = Math.round((50 + newCombo * 25) * hyperMultiplier);
    const newScore = score + gained;
    const newCorrect = correct + 1;
    const newMaxCombo = Math.max(maxCombo, newCombo);
    setCombo(newCombo);
    setMaxCombo(newMaxCombo);
    setBossHp(newBoss);
    setScore(newScore);
    setCorrect(newCorrect);
    setPlayerHp((hp) => Math.min(maxPlayer, hp + 4));
    setFeedback("correct");

    // 💎 diamond drops — every x5 combo the kid earns 1 diamond (feeds the
    // Streak Save currency loop without begging the user to top up).
    if (newCombo > 0 && newCombo % 5 === 0) {
      addDiamonds(1);
      setDiamondsState(getDiamonds());
    }
    setComboPopup({
      text: `+${gained}`,
      combo: newCombo,
      hyper: hyperMultiplier > 1,
      key: Date.now(),
    });
    if (raidRoomCode) {
      api.post(`/classrooms/${raidRoomCode}/progress`, {
        score: newScore, progress: idx + 1,
      }).catch(() => {});
    }
    setTimeout(() => setComboPopup(null), 800);
    setTimeout(() => {
      if (newBoss <= 0) {
        sfx.win?.() || sfx.correct();
        finishSession({
          bossDefeated: true,
          correct: newCorrect,
          wrong,
          score: newScore,
          maxCombo: newMaxCombo,
        });
      } else {
        advance();
      }
    }, 650);
  };

  const onWrong = () => {
    if (sessionFinishedRef.current || feedback) return;

    // 💎 Streak Save — if the kid is on a serious streak AND has a diamond AND
    // we haven't already offered the save for this challenge, pop the modal.
    // We defer the actual wrong-handling until they decide (or timer expires).
    if (
      combo >= STREAK_SAVE_THRESHOLD &&
      diamonds >= 1 &&
      !streakSaveOfferedRef.current &&
      !streakSavedThisChallengeRef.current
    ) {
      streakSaveOfferedRef.current = true;
      setStreakSaveOpen(true);
      return;
    }

    sfx.wrong();
    sfx.bossAttack();
    recordGameStat(false);
    recordReview(false);
    recordBehavioralSignal(false);
    setCombo(0);
    // HP still visually reacts to a wrong answer, but never drops low enough to
    // end the session — the only thing that ends a session is running out of
    // challenges (including the one remix loop over missed items).
    setPlayerHp((hp) => Math.max(15, hp - 18));
    setWrong(wrong + 1);
    setFeedback("wrong");
    setBossShake(true);
    if (challenge && !missedRef.current.includes(challenge)) {
      missedRef.current.push(challenge);
    }
    setTimeout(() => setBossShake(false), 400);
    setTimeout(advance, 700);
  };

  // Called when the user spends 💎 to rescue their combo.
  const handleStreakSave = () => {
    if (!spendDiamonds(1)) { setStreakSaveOpen(false); return; }
    setDiamondsState(getDiamonds());
    streakSavedThisChallengeRef.current = true;
    setStreakSaveOpen(false);
    sfx.correct?.();
    // Still record this as a wrong answer for pedagogy (memory strength shouldn't lie),
    // but keep combo alive — it's a "second chance" not a fake pass.
    recordGameStat(false);
    recordReview(false);
    recordBehavioralSignal(false);
    setPlayerHp((hp) => Math.max(15, hp - 8)); // half damage, since you paid
    setWrong(wrong + 1);
    setFeedback("streak_saved");
    setComboPopup({
      text: "💎 SAVED!",
      combo,
      key: Date.now(),
      variant: "save",
    });
    setTimeout(() => setComboPopup(null), 900);
    setTimeout(() => setFeedback(null), 200);
    setTimeout(advance, 700);
  };

  const handleStreakLetGo = () => {
    setStreakSaveOpen(false);
    // Now run the normal wrong flow — combo will drop.
    streakSavedThisChallengeRef.current = false;
    // Re-enter onWrong; because streakSaveOfferedRef is now true, it will bypass the modal
    onWrong();
  };

  const takeBreak = () => {
    sfx.click();
    snoozePlaySession();
    setShowBreakPrompt(false);
    navigate("/home");
  };

  const keepPlaying = () => {
    sfx.click();
    snoozePlaySession();
    setShowBreakPrompt(false);
  };

  const handleTap = (opt) => {
    if (feedback) return;
    const expected = challenge.answer;
    const ok = opt === expected || normalizeAnswer(opt) === normalizeAnswer(expected);
    if (ok) onCorrect(); else onWrong();
  };

  const handleReplayAudio = () => {
    if (replayLimit != null && replayCount >= replayLimit) return;
    sfx.click();
    totalReplayRef.current += 1;
    challengeReplayRef.current += 1;
    setReplayCount((c) => c + 1);
    speakChallenge(challenge.answer);
  };

  const handleSentenceMakingSubmit = async () => {
    if (feedback || gradingSentence || !typedAnswer.trim()) return;
    setGradingSentence(true);
    setSentenceGradeFeedback(null);
    try {
      const kw = challenge.keyword || challenge.answer;
      const { data } = await api.post("/grade-sentence", {
        keyword: kw,
        sentence: typedAnswer.trim(),
        meaning: challenge.meaning || challenge.hint || null,
      });
      setSentenceGradeFeedback(data.feedback || "");
      if (data.passed) onCorrect();
      else onWrong();
    } catch {
      const kw = challenge.keyword || challenge.answer;
      const ok = typedAnswer.includes(kw) || normalizeAnswer(typedAnswer) === normalizeAnswer(challenge.answer);
      if (ok) onCorrect(); else onWrong();
    } finally {
      setGradingSentence(false);
    }
  };

  const toggleHighlight = (token) => {
    if (feedback) return;
    setHighlightSelected((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  };

  const submitHighlight = () => {
    if (feedback) return;
    const expected = new Set((challenge.keywords || challenge.answer?.split("|") || []).filter(Boolean));
    const sel = highlightSelected;
    const ok = expected.size === sel.size && [...expected].every((k) => sel.has(k));
    if (ok) onCorrect(); else onWrong();
  };

  const restoreDrag = () => {
    sfx.click();
    setDragPool(shuffle(challenge.tiles || []));
    setDragOrder([]);
  };

  const handleMissingLetterSubmit = (answerText) => {
    if (feedback) return;
    const raw = (typeof answerText === "string" ? answerText : typedAnswer).trim();
    if (!raw) return;
    const ok = matchesFillAnswer(raw, challenge);
    if (ok) onCorrect(); else onWrong();
  };

  const handleTypingSubmit = (answerText) => {
    if (feedback) return;
    const raw = (typeof answerText === "string" ? answerText : typedAnswer).trim();
    if (!raw) return;
    const ok = normalizeAnswer(raw) === normalizeAnswer(challenge.answer);
    if (ok) onCorrect(); else onWrong();
  };

  const handleFullRecallSubmit = () => {
    if (feedback || !typedAnswer.trim()) return;
    const ratio = textSimilarity(typedAnswer, challenge.answer);
    setSimilarityResult(Math.round(ratio * 100));
    // 背默 Ready Check must confirm FULL-passage reproduction (spec Section C/D.7)
    // — a high bar, not a partial-sentence pass.
    if (ratio >= FULL_RECALL_PASS_THRESHOLD) onCorrect(); else onWrong();
  };

  const handleDragSubmit = () => {
    if (feedback) return;
    const a = challenge.answer || [];
    const ok = dragOrder.length === a.length && dragOrder.every((v, i) => v === a[i]);
    if (ok) onCorrect(); else onWrong();
  };

  const pickTile = (tile, fromIdx) => {
    if (feedback) return;
    setDragPool(dragPool.filter((_, i) => i !== fromIdx));
    setDragOrder([...dragOrder, tile]);
    sfx.click();
  };
  const unpickTile = (idx2) => {
    if (feedback) return;
    const t = dragOrder[idx2];
    setDragOrder(dragOrder.filter((_, i) => i !== idx2));
    setDragPool([...dragPool, t]);
    sfx.click();
  };

  const progress = progressPct;
  const comboMeterPct = Math.min(100, (combo / COMBO_HYPER_THRESHOLD) * 100);
  const isSentenceDrag = challenge?.type === "drag"
    && Array.isArray(challenge.answer)
    && !(challenge.answer.every((a) => [...String(a)].length <= 1));

  const stepTheme = themeForJourneyGame(game);

  const bossPct = Math.max(0, Math.min(100, (bossHp / maxBoss) * 100));
  const playerPct = Math.max(0, Math.min(100, (playerHp / maxPlayer) * 100));

  return (
    <div className={`relative min-h-screen ${stepTheme.pageBg} text-white overflow-hidden ${isHyperMode ? "hyper-mode" : ""}`} data-testid="battle-page">
      <div className={`absolute inset-0 ${stepTheme.pageGlow}`} />

      {/* Hyper mode — screen glow + drifting sparks */}
      <AnimatePresence>
        {isHyperMode && (
          <motion.div
            key="hyper-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[5]"
            data-testid="hyper-mode-overlay"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/12 via-fuchsia-500/8 to-cyan-400/10 animate-pulse" />
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(251,191,36,0.25)]" />
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span
                key={`hyper-spark-${i}`}
                className="absolute w-1 h-1 rounded-full bg-amber-200/70"
                style={{ left: `${(i * 7.3) % 100}%`, top: `${(i * 11) % 100}%` }}
                animate={{ y: [0, -40, 0], opacity: [0.2, 0.9, 0.2], scale: [0.6, 1.2, 0.6] }}
                transition={{ duration: 1.2 + (i % 4) * 0.3, repeat: Infinity, delay: i * 0.08 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto px-3 py-3 min-h-screen flex flex-col">
        {!raidRoomCode && (
          <button
            type="button"
            data-testid="exit-save-btn"
            onClick={openExitConfirm}
            className="self-start mb-2 flex items-center gap-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 px-3 py-1.5 text-xs font-bold text-sky-100/80 hover:text-white transition-colors"
          >
            🚪 {t("battle_exit_save_btn")}
          </button>
        )}

        {/* Duel HUD — both HP bars top (Street Fighter / Clash Royale style) */}
        <motion.div
          className={`rounded-2xl bg-black/55 backdrop-blur border px-3 py-3 mb-2 ${isHyperMode ? "border-amber-400/50 shadow-[0_0_24px_rgba(251,191,36,0.35)]" : "border-white/10"}`}
          data-testid="duel-hud"
          animate={isHyperMode ? { scale: [1, 1.015, 1] } : { scale: 1 }}
          transition={{ duration: 0.8, repeat: isHyperMode ? Infinity : 0, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.img
              src={ASSETS.boss}
              alt="boss"
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-rose-400/50 shrink-0 ${bossShake ? "animate-shake" : ""}`}
              animate={{ scale: bossShake ? [1, 1.08, 1] : 1 }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                <span className="text-rose-300 truncate">{game.boss_name || "Boss"}</span>
                {isRemixLoop && <span className="text-violet-300 shrink-0">{t("battle_remix_label")}</span>}
                <span className="text-emerald-300 shrink-0">{t("battle_player_hp")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 sm:h-3 rounded-full bg-slate-900/80 overflow-hidden border border-rose-500/20">
                  <div className={`h-full rounded-full bg-gradient-to-r ${stepTheme.bossHp} transition-all duration-300`} style={{ width: `${bossPct}%` }} data-testid="boss-hp" />
                </div>
                <span className="text-[10px] text-white/40 font-bold shrink-0">VS</span>
                <div className="flex-1 h-2.5 sm:h-3 rounded-full bg-slate-900/80 overflow-hidden border border-emerald-500/20">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300" style={{ width: `${playerPct}%` }} data-testid="player-hp" />
                </div>
              </div>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-lg shrink-0">🛡️</div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div className={`h-full rounded-full bg-gradient-to-r ${stepTheme.progress}`} animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-900/80 overflow-hidden border border-amber-500/20">
              <motion.div
                className={`h-full rounded-full ${isHyperMode ? "bg-gradient-to-r from-amber-300 via-fuchsia-400 to-cyan-300" : "bg-gradient-to-r from-amber-500/80 to-orange-500/80"}`}
                animate={{ width: `${comboMeterPct}%` }}
                transition={{ duration: 0.3 }}
                data-testid="combo-meter"
              />
            </div>
            {isHyperMode && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="text-[10px] font-display font-black uppercase tracking-wider text-amber-200 shrink-0"
                data-testid="hyper-badge"
              >
                HYPER
              </motion.span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] sm:text-xs">
            <div>
              <span className={`font-bold ${isHyperMode ? "text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "text-amber-300"}`} data-testid="combo-counter">x{combo}</span>
              {isHyperMode && <span className="text-fuchsia-300 font-bold ml-0.5">2×</span>}
              <span className="text-white/45"> {t("stat_combo")}</span>
            </div>
            <div><span className="text-sky-300 font-bold" data-testid="score-value">{score}</span> <span className="text-white/45">{t("stat_score")}</span></div>
            <div><span className="text-emerald-300 font-bold">{correct}/{correct + wrong}</span> <span className="text-white/45">{t("stat_hits")}</span></div>
            <div data-testid="diamonds-counter">
              💎 <span className="text-fuchsia-200 font-bold">{diamonds}</span>
            </div>
          </div>
        </motion.div>

        {(game?.timed_mission || challenge?.time_limit_sec) && challenge?.type !== "rescue" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-1.5 text-center text-sm"
            data-testid="timed-mission-banner"
          >
            <span className="font-display font-bold text-orange-200">{t("battle_timed_mission")}</span>
          </motion.div>
        )}

        {/* Challenge arena — full width, minimal chrome */}
        <div className="flex-1 flex flex-col min-h-0 py-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col w-full"
            >
              {(challenge.prompt && challenge.type !== "speed_grid" && challenge.type !== "slash"
                && challenge.type !== "memory_write" && challenge.type !== "typing") && (
                <h3 className="font-display text-lg sm:text-xl text-center font-bold mb-4 px-1 text-white/90" data-testid="challenge-prompt">
                  {challenge.prompt}
                </h3>
              )}

              {timeLeft !== null && !["rescue", "slash", "speed_grid"].includes(challenge.type) && !(challenge.type === "typing" && challenge.time_limit_sec) && (
                <div
                  className={`text-center mb-4 font-display text-2xl font-bold tabular-nums ${timeLeft <= 2 ? "text-rose-400 animate-pulse" : "text-amber-300"}`}
                  data-testid="battle-timer"
                >
                  ⏱ {timeLeft}s
                </div>
              )}

              {peekFlash && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 rounded-2xl bg-amber-400/20 border border-amber-300/50 py-3 px-4 text-center font-display text-xl font-bold text-amber-100"
                  data-testid="peek-flash"
                >
                  👀 {peekFlash}
                </motion.div>
              )}

              {!peekDisabled && peekLimit > 0 && (
                <div className="flex justify-center mb-4">
                  <button
                    type="button"
                    data-testid="peek-hint-btn"
                    disabled={peekCount >= peekLimit}
                    onClick={handlePeekHint}
                    className="text-sm px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    👀 {t("battle_peek")}{peekLimit < 999 ? ` ${t("battle_peek_left", { n: Math.max(0, peekLimit - peekCount) })}` : ""}
                  </button>
                </div>
              )}

              {challenge.type === "target_hunt" && (
                <TargetWordHuntGame challenge={challenge} onCorrect={onCorrect} onWrong={onWrong} disabled={!!feedback} />
              )}

              {challenge.type === "flashcard_read" && (
                <FlashCardReadGame challenge={challenge} onCorrect={onCorrect} disabled={!!feedback} />
              )}

              {challenge.type === "flashcard" && (
                <MemoryFlipGame challenge={challenge} onTap={handleTap} disabled={!!feedback} variant="flashcard" />
              )}

              {challenge.type === "memory_match" && (
                <MemoryFlipGame
                  challenge={challenge}
                  onTap={handleTap}
                  disabled={!!feedback}
                  variant={challenge.game_type === "G19" ? "synonym" : "memory"}
                  title={challenge.prompt_label || challenge.prompt}
                />
              )}

              {challenge.type === "memory_write" && (
                <MemoryWriteGame
                  challenge={challenge}
                  typedAnswer={typedAnswer}
                  setTypedAnswer={setTypedAnswer}
                  onSubmit={handleTypingSubmit}
                  disabled={!!feedback}
                />
              )}

              {challenge.type === "cloze_fill" && (
                <ClozeFillGame challenge={challenge} onTap={handleTap} disabled={!!feedback} />
              )}

              {challenge.type === "word_detective" && (
                <WordDetectiveGame challenge={challenge} onTap={handleTap} disabled={!!feedback} />
              )}

              {challenge.type === "diagnostic" && (
                <div data-testid="diagnostic-panel" className="space-y-4">
                  <p className="text-sm text-sky-100/80 text-center">{challenge.prompt}</p>
                  <ul className="rounded-2xl bg-violet-500/10 border border-violet-400/30 p-4 space-y-2 text-sm">
                    {(challenge.weak_terms || []).map((term, i) => (
                      <li key={i} className="flex gap-2"><span>📌</span><span>{term}</span></li>
                    ))}
                  </ul>
                  <Button onClick={() => { sfx.click(); onCorrect(); }} className="w-full rounded-2xl py-5 font-bold bg-violet-500 text-white">
                    {t("battle_diagnostic_start")}
                  </Button>
                </div>
              )}

              {challenge.type === "read_along" && (
                <div data-testid="read-along" className="space-y-4">
                  <div className="rounded-2xl bg-sky-500/10 border border-sky-400/30 p-4 text-center">
                    <p className="text-sm leading-relaxed">{challenge.passage}</p>
                    <button type="button" onClick={() => { sfx.click(); speak(challenge.passage); setReadAlongReady(true); }} className="mt-3 text-sky-200 underline text-sm">{t("battle_read_along_listen")}</button>
                  </div>
                  {!readAlongReady && (
                    <Button onClick={() => setReadAlongReady(true)} className="w-full rounded-2xl py-4 bg-sky-500 text-slate-900 font-bold">{t("battle_read_along_continue")}</Button>
                  )}
                  {readAlongReady && (
                    <div className="grid grid-cols-1 gap-2">
                      <p className="text-sm text-center text-white/70">{challenge.question}</p>
                      {challenge.options?.map((opt, i) => (
                        <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={() => handleTap(opt)} disabled={!!feedback} className="rounded-xl p-3 font-bold bg-white/10 border border-white/20">{opt}</motion.button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {challenge.type === "highlight" && (
                <div data-testid="highlight-game" className="space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {challenge.tokens?.map((tok, i) => (
                      <button
                        key={`${i}-${tok}`}
                        type="button"
                        onClick={() => toggleHighlight(tok)}
                        disabled={!!feedback}
                        className={`px-2 py-1 rounded-lg text-lg font-display ${
                          highlightSelected.has(tok) ? "bg-amber-400 text-slate-900 ring-2 ring-amber-200" : "bg-white/10"
                        }`}
                      >
                        {tok}
                      </button>
                    ))}
                  </div>
                  <Button onClick={submitHighlight} disabled={!!feedback || highlightSelected.size === 0} className="w-full rounded-2xl py-4 bg-amber-500 text-slate-900 font-bold">{t("battle_highlight_submit")}</Button>
                </div>
              )}

              {challenge.type === "slash" && (
                <SlashGame challenge={challenge} onCorrect={onCorrect} onWrong={onWrong} disabled={!!feedback} />
              )}

              {challenge.type === "speed_grid" && (
                <SpeedGridGame challenge={challenge} onCorrect={onCorrect} onWrong={onWrong} disabled={!!feedback} />
              )}

              {challenge.type === "rescue" && (
                <RescueGame challenge={challenge} onCorrect={onCorrect} onWrong={onWrong} disabled={!!feedback} />
              )}

              {challenge.type === "crossword" && (
                <FillBlankGame
                  challenge={challenge}
                  variant="crossword"
                  typedAnswer={typedAnswer}
                  setTypedAnswer={setTypedAnswer}
                  onSubmit={handleMissingLetterSubmit}
                  disabled={!!feedback}
                />
              )}

              {challenge.type === "sentence_making" && (
                <SentenceMakingGame
                  challenge={challenge}
                  typedAnswer={typedAnswer}
                  setTypedAnswer={setTypedAnswer}
                  onSubmit={handleSentenceMakingSubmit}
                  disabled={!!feedback}
                  grading={gradingSentence}
                  feedback={sentenceGradeFeedback}
                />
              )}

              {challenge.type === "tap" && challenge.game_type === "G1" && (
                <BubblePopGame challenge={challenge} onCorrect={onCorrect} onWrong={onWrong} disabled={!!feedback} />
              )}

              {challenge.type === "tap" && challenge.game_type !== "G1" && (
                <TapChoiceGame
                  challenge={challenge}
                  onTap={handleTap}
                  disabled={!!feedback}
                  variant={challenge.game_type}
                />
              )}

              {(challenge.type === "idiom_repair" || challenge.type === "stroke_order") && (
                <div>
                  {challenge.type === "idiom_repair" && (
                    <div className="text-center font-display text-4xl mb-3 tracking-widest">{challenge.idiom}</div>
                  )}
                  {challenge.type === "stroke_order" && (
                    <div className="flex flex-col items-center gap-2 mb-3">
                      <div className="font-display text-6xl">{challenge.character}</div>
                      {/* Non-scored teaching aid (spec Section B.3): shows how the
                          character is actually written, separate from the graded
                          typed/tapped answer — never AI-graded, never required. */}
                      <button
                        type="button"
                        data-testid="watch-stroke-order-btn"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); sfx.click(); setShowStrokeTeach(true); }}
                        className="text-xs text-sky-200/70 hover:text-white underline underline-offset-2"
                      >
                        {t("battle_stroke_watch")}
                      </button>
                    </div>
                  )}
                  <TapChoiceGame challenge={challenge} onTap={handleTap} disabled={!!feedback} variant={challenge.type} />
                </div>
              )}

              {challenge.type === "drag" && isSentenceDrag && (
                <LogicOrderGame challenge={challenge} onCorrect={onCorrect} onWrong={onWrong} disabled={!!feedback} />
              )}

              {challenge.type === "drag" && !isSentenceDrag && (
                <UnscrambleGame
                  challenge={challenge}
                  dragOrder={dragOrder}
                  dragPool={dragPool}
                  pickTile={pickTile}
                  unpickTile={unpickTile}
                  onSubmit={handleDragSubmit}
                  onRestore={restoreDrag}
                  disabled={!!feedback}
                />
              )}

              {challenge.type === "memory_flash" && (
                <div data-testid="memory-flash">
                  <AnimatePresence mode="wait">
                    {flashShown ? (
                      <motion.div
                        key="flash"
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="text-center py-10 rounded-3xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border border-violet-400/40"
                      >
                        <div className="text-xs uppercase tracking-widest text-violet-200 mb-2">{t("battle_memory_flash")}</div>
                        <div className="font-display text-4xl font-bold">{challenge.target}</div>
                      </motion.div>
                    ) : (
                      <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
                        {challenge.options?.map((opt, optIndex) => (
                          <motion.button
                            key={`${idx}-mem-${optIndex}`}
                            data-testid={`memory-option-${optIndex}`}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleTap(opt)}
                            disabled={!!feedback}
                            className={`btn-tactile rounded-2xl p-4 font-display text-lg font-bold border-2 ${
                              feedback && opt === challenge.answer ? "bg-emerald-500/30 border-emerald-300" :
                              "bg-gradient-to-b from-violet-500 to-fuchsia-700 border-violet-300/50 shadow-[0_6px_0_rgba(91,33,182,0.7)]"
                            }`}
                          >{opt}</motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {challenge.type === "missing_letter" && (
                <FillBlankGame
                  challenge={challenge}
                  variant={(challenge.masked || "").length > (challenge.answer?.length || 0) + 3 ? "sentence" : "letters"}
                  typedAnswer={typedAnswer}
                  setTypedAnswer={setTypedAnswer}
                  onSubmit={handleMissingLetterSubmit}
                  disabled={!!feedback}
                />
              )}

              {challenge.type === "typing" && (
                <DictationGame
                  challenge={challenge}
                  typedAnswer={typedAnswer}
                  setTypedAnswer={setTypedAnswer}
                  onSubmit={handleTypingSubmit}
                  disabled={!!feedback}
                  listenMode={listenMode}
                  onToggleListenMode={toggleListenMode}
                  onPlayWord={() => { sfx.click(); speakChallenge(challenge.answer); }}
                  onPlaySentence={() => {
                    sfx.click();
                    const ctx = challenge.context || challenge.explanation;
                    speak(ctx ? `${ctx}`.replace(/___+/g, challenge.answer) : challenge.answer);
                  }}
                  status={feedback === "correct" ? "correct" : feedback === "wrong" ? "wrong" : "idle"}
                  timeLimitSec={challenge.time_limit_sec || null}
                  onTimeUp={onWrong}
                />
              )}

              {challenge.type === "full_recall" && (
                <FullRecallGame
                  typedAnswer={typedAnswer}
                  setTypedAnswer={setTypedAnswer}
                  onSubmit={handleFullRecallSubmit}
                  disabled={!!feedback}
                  onFirstInput={() => {
                    if (!firstInputRef.current) firstInputRef.current = Date.now();
                  }}
                  similarityResult={similarityResult}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Combo popup */}
      <AnimatePresence>
        {comboPopup && (
          <motion.div
            key={comboPopup.key}
            initial={{ opacity: 0, scale: 0.4, y: 20 }}
            animate={{ opacity: 1, scale: 1.2, y: -20 }}
            exit={{ opacity: 0, scale: 0.8, y: -40 }}
            className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 font-display text-5xl font-bold text-amber-300 drop-shadow-[0_4px_24px_rgba(251,191,36,0.7)]"
          >
            {comboPopup.text}
            {comboPopup.hyper && <span className="block text-xl text-fuchsia-300">HYPER 2×!</span>}
            {comboPopup.combo > 1 && <span className="block text-2xl text-rose-300">COMBO x{comboPopup.combo}!</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hyper burst on activation */}
      <AnimatePresence>
        {hyperBurst && (
          <motion.div
            key="hyper-burst"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center"
          >
            <div className="font-display text-5xl sm:text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-fuchsia-300 to-cyan-200 drop-shadow-[0_0_40px_rgba(251,191,36,0.9)]">
              HYPER MODE
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback flash */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} exit={{ opacity: 0 }}
            className={`pointer-events-none fixed inset-0 ${feedback === "correct" ? "bg-emerald-400" : "bg-rose-500"}`}
          />
        )}
      </AnimatePresence>

      {/* Stroke order teaching aid — non-scored, purely instructional */}
      <AnimatePresence>
        {showStrokeTeach && challenge?.type === "stroke_order" && (
          <StrokeOrderTeach
            character={challenge.character}
            strokeCount={challenge.answer ? String(challenge.answer).split("-").length : 8}
            onClose={() => setShowStrokeTeach(false)}
          />
        )}
      </AnimatePresence>

      {/* 💎 Streak Save — spend 1 diamond to rescue a broken combo */}
      <StreakSaveModal
        open={streakSaveOpen}
        combo={combo}
        diamonds={diamonds}
        onSave={handleStreakSave}
        onLetGo={handleStreakLetGo}
      />

      {/* Gentle break reminder after 1hr+ of continuous play — never blocks the
          adventure, just offers a choice. */}
      <AnimatePresence>
        {showBreakPrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }}
              className="max-w-sm w-full rounded-3xl bg-slate-900 border border-amber-400/30 p-6 text-center space-y-4"
              data-testid="break-reminder"
            >
              <div className="text-5xl">🧘</div>
              <h3 className="font-display text-xl font-bold text-white">{t("battle_break_title")}</h3>
              <p className="text-sm text-sky-100/70">
                {t("battle_break_body")}
              </p>
              <div className="space-y-2">
                <Button
                  data-testid="take-break-btn"
                  onClick={takeBreak}
                  className="w-full rounded-2xl py-5 font-display font-bold bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-900"
                >
                  🏡 {t("battle_break_home")}
                </Button>
                <Button
                  data-testid="keep-playing-btn"
                  onClick={keepPlaying}
                  variant="outline"
                  className="w-full rounded-2xl py-5 font-display font-bold border-white/20 text-white hover:bg-white/10"
                >
                  ⚔️ {t("battle_break_snooze")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit & Save confirmation */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }}
              className="max-w-sm w-full rounded-3xl bg-slate-900 border border-sky-400/30 p-6 text-center space-y-4"
              data-testid="exit-save-confirm"
            >
              <div className="text-5xl">💾</div>
              <h3 className="font-display text-xl font-bold text-white">{t("battle_exit_save_title")}</h3>
              <p className="text-sm text-sky-100/70">
                {t("battle_exit_save_body")}
              </p>
              <div className="space-y-2">
                <Button
                  data-testid="confirm-exit-save-btn"
                  onClick={confirmExitAndSave}
                  className="w-full rounded-2xl py-5 font-display font-bold bg-gradient-to-b from-sky-400 to-blue-600 text-white"
                >
                  💾 {t("battle_exit_save_confirm")}
                </Button>
                <Button
                  data-testid="cancel-exit-save-btn"
                  onClick={() => { sfx.click(); setShowExitConfirm(false); }}
                  variant="outline"
                  className="w-full rounded-2xl py-5 font-display font-bold border-white/20 text-white hover:bg-white/10"
                >
                  ⚔️ {t("battle_break_snooze")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
