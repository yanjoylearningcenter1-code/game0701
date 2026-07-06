import api from "@/lib/api";
import { saveBattleSnapshot, loadBattleSnapshot, clearBattleSnapshot } from "./battleSnapshot";

/** Save mid-battle progress to server (Resume Engine §6.2) + local fallback. */
export async function saveProgressSnapshot(snapshot) {
  saveBattleSnapshot(snapshot);
  try {
    await api.post("/progress-snapshot", {
      track_id: sessionStorage.getItem("track_id") || null,
      step_number: parseInt(sessionStorage.getItem("journey_step") || "1", 10),
      unit_ids: JSON.parse(sessionStorage.getItem("game_unit_ids") || "[]"),
      game: snapshot.game,
      progress: {
        deck: snapshot.deck,
        idx: snapshot.idx,
        bossHp: snapshot.bossHp,
        playerHp: snapshot.playerHp,
        combo: snapshot.combo,
        score: snapshot.score,
        maxCombo: snapshot.maxCombo,
        correct: snapshot.correct,
        wrong: snapshot.wrong,
        isRemixLoop: snapshot.isRemixLoop,
        missed: snapshot.missed,
        remixDone: snapshot.remixDone,
      },
    });
  } catch {
    /* local snapshot still works offline */
  }
}

export async function loadProgressSnapshot() {
  try {
    const r = await api.get("/progress-snapshot");
    const snap = r.data?.game ? r.data : r.data?.snapshot;
    if (snap?.game && snap?.progress) {
      return {
        game: snap.game,
        deck: snap.progress.deck || snap.game.challenges,
        idx: snap.progress.idx || 0,
        bossHp: snap.progress.bossHp,
        playerHp: snap.progress.playerHp,
        combo: snap.progress.combo,
        score: snap.progress.score,
        maxCombo: snap.progress.maxCombo,
        correct: snap.progress.correct,
        wrong: snap.progress.wrong,
        isRemixLoop: snap.progress.isRemixLoop,
        missed: snap.progress.missed,
        remixDone: snap.progress.remixDone,
        fromServer: true,
      };
    }
  } catch {
    /* fall through */
  }
  const local = loadBattleSnapshot();
  return local ? { ...local, fromServer: false } : null;
}

export async function clearProgressSnapshot() {
  clearBattleSnapshot();
  try {
    await api.delete("/progress-snapshot");
  } catch {
    /* ignore */
  }
}

export function continueBattleFromSnapshot(snap) {
  if (!snap?.game) return false;
  sessionStorage.setItem("game", JSON.stringify(snap.game));
  sessionStorage.setItem("battle_autoresume", "1");
  return true;
}
