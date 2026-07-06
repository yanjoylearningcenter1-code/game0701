import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import BattlePage from "@/pages/BattlePage";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

function wsUrl(roomCode) {
  const base = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/api/ws/classrooms/${roomCode}`;
}

export default function StudentRaidPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const [room, setRoom] = useState(null);
  const [started, setStarted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get(`/classrooms/${roomCode}`);
      setRoom(r.data);
      if (r.data.status === "active" && r.data.active_game) {
        sessionStorage.setItem("game", JSON.stringify(r.data.active_game));
        sessionStorage.setItem("raid_mode", "1");
        setStarted(true);
      }
    } catch {
      toast?.error?.(t("jr_fail"));
    }
  }, [roomCode, t]);

  useEffect(() => {
    refresh();
    const ws = new WebSocket(wsUrl(roomCode));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "game_started" && msg.game) {
        sessionStorage.setItem("game", JSON.stringify(msg.game));
        sessionStorage.setItem("raid_mode", "1");
        setStarted(true);
      }
      if (msg.type === "raid_finished") navigate("/home");
      if (msg.type === "participant_joined") refresh();
    };
    return () => ws.close();
  }, [roomCode, refresh, navigate]);

  if (started) {
    return <BattlePage raidRoomCode={roomCode} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4" data-testid="student-raid-lobby">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="font-display text-3xl font-bold">{room?.name || t("raid_lobby_title")}</h1>
        <p className="text-sky-200/70 mt-2">{t("raid_lobby_wait")}</p>
        <p className="mt-6 font-mono text-2xl tracking-widest text-amber-300">{roomCode}</p>
        <p className="text-sm text-white/50 mt-4">{t("raid_lobby_students", { n: room?.participants?.length || 0 })}</p>
        <Button onClick={() => navigate("/home")} variant="outline" className="mt-8 rounded-xl">{t("raid_leave")}</Button>
      </div>
    </div>
  );
}
