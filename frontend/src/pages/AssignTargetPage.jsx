import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Particles } from "@/lib/design";
import { sfx } from "@/lib/audio";
import { toast } from "sonner";

export default function AssignTargetPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const assignFlow = sessionStorage.getItem("assign_flow");
  const [rooms, setRooms] = useState([]);
  const [roster, setRoster] = useState([]);
  const [familyLinks, setFamilyLinks] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assignFlow) {
      navigate("/mode", { replace: true });
      return;
    }
    (async () => {
      try {
        if (assignFlow === "teacher") {
          const [r, ro] = await Promise.all([api.get("/classrooms"), api.get("/teacher/roster")]);
          setRooms(r.data || []);
          setRoster(ro.data?.students || []);
        } else {
          const fl = await api.get("/family-links");
          setFamilyLinks(fl.data || []);
          if (fl.data?.length === 1) {
            setSelectedStudents([fl.data[0].kid_owner_id]);
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [assignFlow, navigate]);

  const toggleStudent = (ownerId) => {
    sfx.click();
    setSelectedStudents((prev) =>
      prev.includes(ownerId) ? prev.filter((id) => id !== ownerId) : [...prev, ownerId]
    );
  };

  const selectRoom = (code) => {
    sfx.click();
    setSelectedRoom(code === selectedRoom ? "" : code);
    if (code && code !== selectedRoom) {
      const inRoom = roster.filter((s) => s.room_code === code).map((s) => s.guest_id && `guest_${s.guest_id}`.replace("guest_guest_", "guest_"));
      const owners = roster
        .filter((s) => s.room_code === code)
        .map((s) => (s.guest_id?.startsWith("guest_") ? s.guest_id : `guest_${s.guest_id}`))
        .filter(Boolean);
      setSelectedStudents((prev) => [...new Set([...prev, ...owners])]);
    }
  };

  const continueAssign = () => {
    if (assignFlow === "teacher" && !selectedRoom && selectedStudents.length === 0) {
      toast.error("Pick a classroom or at least one student");
      return;
    }
    if (assignFlow === "parent" && selectedStudents.length === 0) {
      toast.error("Select at least one child");
      return;
    }
    sfx.click();
    sessionStorage.setItem("assign_student_ids", JSON.stringify(selectedStudents));
    if (selectedRoom) sessionStorage.setItem("assign_room_code", selectedRoom);
    else sessionStorage.removeItem("assign_room_code");
    sessionStorage.setItem("assign_multi", selectedStudents.length > 1 || assignFlow === "teacher" ? "1" : "");
    if (selectedStudents.length === 1) {
      sessionStorage.setItem("assign_student_id", selectedStudents[0]);
    } else {
      sessionStorage.removeItem("assign_student_id");
    }
    navigate("/transform");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading…</div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-white" data-testid="assign-target-page">
      <Particles count={14} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate(-1)} className="text-sky-200/70 hover:text-white text-sm mb-6">← Back</button>
        <h1 className="font-display text-3xl font-bold">
          {assignFlow === "teacher" ? "📋 Assign to Class" : "📋 Assign to Child"}
        </h1>
        <p className="text-sky-100/70 mt-2 text-sm">
          Choose who receives this homework. They'll play on their devices — you won't need to.
        </p>

        {assignFlow === "teacher" && (
          <>
            <section className="mt-8">
              <h2 className="font-display text-lg font-bold mb-3">🏫 Classroom (room code)</h2>
              {rooms.length === 0 ? (
                <p className="text-sm text-white/50">No raids yet — create one on your dashboard, or pick students below.</p>
              ) : (
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <button
                      key={room.room_code}
                      type="button"
                      data-testid={`room-${room.room_code}`}
                      onClick={() => selectRoom(room.room_code)}
                      className={`w-full text-left rounded-2xl p-4 border transition-all ${
                        selectedRoom === room.room_code
                          ? "border-violet-400 bg-violet-500/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-bold">{room.name}</div>
                      <div className="text-xs text-white/50 mt-1">
                        Code: {room.room_code} · {(room.participants || []).length} joined
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h2 className="font-display text-lg font-bold mb-3">🧒 Roster</h2>
              {roster.length === 0 ? (
                <p className="text-sm text-white/50">Students appear here after they join a raid with your room code.</p>
              ) : (
                <div className="space-y-2">
                  {roster.map((s) => {
                    const oid = s.guest_id?.startsWith("guest_") ? s.guest_id : `guest_${s.guest_id}`;
                    const checked = selectedStudents.includes(oid);
                    return (
                      <button
                        key={`${s.room_code}-${s.guest_id}`}
                        type="button"
                        onClick={() => toggleStudent(oid)}
                        className={`w-full flex items-center justify-between rounded-2xl p-3 border ${
                          checked ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span>{s.display_name}</span>
                        <span className="text-xs text-white/40">{s.room_name}</span>
                        {checked && <span className="text-amber-300">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {assignFlow === "parent" && (
          <section className="mt-8">
            <h2 className="font-display text-lg font-bold mb-3">👨‍👩‍👧 Linked children</h2>
            {familyLinks.length === 0 ? (
              <p className="text-sm text-white/50">Link a child from your dashboard first (family code).</p>
            ) : (
              <div className="space-y-2">
                {familyLinks.map((fl) => {
                  const checked = selectedStudents.includes(fl.kid_owner_id);
                  return (
                    <button
                      key={fl.link_id || fl.kid_owner_id}
                      type="button"
                      onClick={() => toggleStudent(fl.kid_owner_id)}
                      className={`w-full flex items-center justify-between rounded-2xl p-4 border ${
                        checked ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <span>Child device</span>
                      <span className="text-xs font-mono text-white/40">{fl.kid_owner_id?.slice(-8)}</span>
                      {checked && <span className="text-amber-300">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <Button
          data-testid="assign-continue-btn"
          onClick={continueAssign}
          className="btn-tactile w-full mt-10 rounded-2xl py-7 text-lg font-display font-bold bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900"
        >
          Save Assignment →
        </Button>
      </div>
    </div>
  );
}
