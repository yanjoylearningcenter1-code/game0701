import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { toast } from "sonner";

function wsUrl(roomCode) {
  const base = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
  return `${base.replace(/^http/, "ws")}/api/ws/classrooms/${roomCode}`;
}

export default function TeacherLiveRaidPage() {
  const { roomCode } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [text, setText] = useState("The cat sat on the mat. Dogs bark loudly.");

  const refresh = useCallback(async () => {
    try {
      const r = await api.get(`/classrooms/${roomCode}`);
      setRoom(r.data);
    } catch {
      toast.error("Room not found");
    }
  }, [roomCode]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
    else refresh();
  }, [loading, user, navigate, refresh]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(roomCode));
    ws.onmessage = () => refresh();
    return () => ws.close();
  }, [roomCode, refresh]);

  const startRaid = async () => {
    try {
      await api.post(`/classrooms/${roomCode}/start`, { text });
      toast.success("Raid started!");
      refresh();
    } catch {
      toast.error("Failed to start raid");
    }
  };

  const finishRaid = async () => {
    await api.post(`/classrooms/${roomCode}/finish`);
    toast.success("Raid finished");
    navigate("/teacher");
  };

  if (!room) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-violet-50/40 px-4 py-8" data-testid="teacher-live-raid">
      <div className="max-w-3xl mx-auto">
        <Button variant="outline" onClick={() => navigate("/teacher")} className="mb-4 rounded-xl">← Back</Button>
        <h1 className="font-display text-4xl font-bold">{room.name}</h1>
        <p className="text-slate-600">Room {roomCode} · {room.status}</p>

        <Card className="mt-6 rounded-3xl">
          <CardHeader><CardTitle>Live scoreboard</CardTitle></CardHeader>
          <CardContent>
            {(room.participants || []).length === 0 && <p className="text-slate-500 text-sm">No students yet</p>}
            {(room.participants || []).map((p) => (
              <div key={p.guest_id} className="flex justify-between py-2 border-b border-slate-100">
                <span>{p.display_name}</span>
                <span className="font-bold">{p.score} pts · Q{p.progress}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {room.status === "waiting" && (
          <Card className="mt-6 rounded-3xl">
            <CardHeader><CardTitle>Start raid</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input value={text} onChange={(e) => setText(e.target.value)} className="rounded-xl" />
              <Button data-testid="start-raid-btn" onClick={startRaid} className="w-full rounded-xl bg-violet-600">Start Battle</Button>
            </CardContent>
          </Card>
        )}

        {room.status === "active" && (
          <Button data-testid="finish-raid-btn" onClick={finishRaid} className="mt-6 w-full rounded-xl bg-rose-600">End Raid</Button>
        )}
      </div>
    </div>
  );
}
