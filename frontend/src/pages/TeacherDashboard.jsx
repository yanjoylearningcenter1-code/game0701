import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSETS, MODES } from "@/lib/design";
import { toast } from "sonner";
import { purchaseTeacherPlan, isNativeIapAvailable, initIap } from "@/lib/iap";
import CalendarView from "@/components/CalendarView";
import { useLang } from "@/lib/i18n";

export default function TeacherDashboard() {
  const { t } = useLang();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roster, setRoster] = useState([]);
  const [heatmap, setHeatmap] = useState({ buckets: {}, students: [] });
  const [name, setName] = useState("");
  const [mode, setMode] = useState("quiz");
  const [validHours, setValidHours] = useState("24");
  const [calendar, setCalendar] = useState({ events: [], daily_load: [] });
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    refresh();
    api.get("/teacher/billing").then((r) => setBilling(r.data)).catch(() => {});
    setCalendarLoading(true);
    api.get("/teacher/calendar")
      .then((r) => setCalendar(r.data || { events: [], daily_load: [] }))
      .catch((err) => console.warn("teacher calendar load failed", err))
      .finally(() => setCalendarLoading(false));
  }, [loading, user, navigate]);

  const refresh = async () => {
    try {
      const [r, ro, hm] = await Promise.all([api.get("/classrooms"), api.get("/teacher/roster"), api.get("/teacher/heatmap")]);
      setRooms(r.data || []);
      setRoster(ro.data?.students || []);
      setHeatmap(hm.data || { buckets: {}, students: [] });
    } catch (err) {
      console.warn("classrooms fetch failed", err);
    }
  };

  const create = async () => {
    if (!name.trim()) { toast.error(t("teacher_raid_name_required")); return; }
    try {
      const hours = validHours === "0" ? null : Number(validHours);
      const r = await api.post("/classrooms", { name: name.trim(), mode, valid_hours: hours });
      toast.success(t("teacher_raid_created", { code: r.data.room_code }));
      setName("");
      refresh();
    } catch { toast.error(t("teacher_create_fail")); }
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center">{t("teacher_loading")}</div>;

  return (
    <div className="min-h-screen bg-violet-50/40" data-testid="teacher-dashboard">
      <header className="bg-white border-b border-violet-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={ASSETS.teacher} alt="" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <div className="font-display font-bold text-slate-900">{t("teacher_title")}</div>
              <div className="text-xs text-slate-500">{user.name}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="upload-material-btn"
              onClick={() => {
                sessionStorage.removeItem("quick_battle");
                sessionStorage.setItem("assign_flow", "teacher");
                navigate("/upload");
              }}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
            >
              📸 {t("teacher_upload")}
            </Button>
            <Button data-testid="logout-btn" variant="outline" onClick={async () => { await logout(); navigate("/"); }} className="rounded-xl">{t("teacher_logout")}</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-display text-4xl font-bold text-slate-900">{t("teacher_raids_title")}</h1>
        <p className="text-slate-600 mt-2">{t("teacher_raids_sub")}</p>

        <Card className="mt-6 rounded-3xl border-violet-100">
          <CardHeader><CardTitle className="font-display">⚔ {t("teacher_new_raid")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input data-testid="raid-name-input" placeholder={t("teacher_raid_placeholder")} value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger data-testid="raid-mode-select" className="rounded-xl"><SelectValue placeholder="Mode" /></SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => <SelectItem key={m.id} value={m.id}>{m.title} — {m.subtitle}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={validHours} onValueChange={setValidHours}>
                <SelectTrigger data-testid="raid-expiry-select" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">{t("teacher_expiry_2h")}</SelectItem>
                  <SelectItem value="8">{t("teacher_expiry_8h")}</SelectItem>
                  <SelectItem value="24">{t("teacher_expiry_1d")}</SelectItem>
                  <SelectItem value="168">{t("teacher_expiry_7d")}</SelectItem>
                  <SelectItem value="0">{t("teacher_expiry_unlimited")}</SelectItem>
                </SelectContent>
              </Select>
              <Button data-testid="create-raid-btn" onClick={create} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white">{t("teacher_raid_create")}</Button>
            </div>
          </CardContent>
        </Card>

        {billing && (
          <Card className="mt-6 rounded-3xl border-indigo-200" data-testid="teacher-billing-card">
            <CardHeader><CardTitle className="font-display">💳 {t("teacher_billing_title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{t("teacher_billing_sub")}</p>
              <p className="font-semibold text-slate-800 capitalize">{billing.plan || "free"} · {billing.price_label}</p>
              <p className="text-sm text-slate-600">{t("teacher_seats_used", { used: billing.seats_used || 0, limit: billing.seat_limit || 30 })}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={async () => {
                  try {
                    await api.post("/teacher/billing/plan", { plan: "classroom", source: "manual" });
                    toast.success("Classroom plan");
                    const r = await api.get("/teacher/billing");
                    setBilling(r.data);
                  } catch { toast.error(t("teacher_create_fail")); }
                }}>{t("teacher_upgrade_classroom")}</Button>
                <Button variant="outline" className="rounded-xl" onClick={async () => {
                  if (isNativeIapAvailable()) {
                    await initIap(`teacher_${user.user_id}`);
                    await purchaseTeacherPlan("school");
                  } else {
                    await api.post("/teacher/billing/plan", { plan: "school", source: "manual" });
                  }
                  const r = await api.get("/teacher/billing");
                  setBilling(r.data);
                  toast.success("School plan");
                }}>{t("teacher_upgrade_school")}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8 rounded-3xl border-violet-100">
          <CardHeader><CardTitle className="font-display">🌡 {t("teacher_heatmap")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { key: "critical", label: "<40%", color: "bg-rose-500" },
                { key: "weak", label: "40–59%", color: "bg-amber-400" },
                { key: "ok", label: "60–79%", color: "bg-sky-400" },
                { key: "strong", label: "80%+", color: "bg-emerald-500" },
              ].map((b) => (
                <div key={b.key} className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className={`h-2 rounded-full ${b.color} mb-2`} />
                  <div className="font-bold text-slate-800">{heatmap.buckets?.[b.key] || 0}</div>
                  <div className="text-xs text-slate-500">{b.label}</div>
                </div>
              ))}
            </div>
            {heatmap.students?.length === 0 && (
              <p className="text-slate-500 text-sm">{t("teacher_heatmap_empty")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 rounded-3xl border-violet-100">
          <CardHeader><CardTitle className="font-display">📊 {t("teacher_readiness")}</CardTitle></CardHeader>
          <CardContent>
            {roster.length === 0 ? (
              <p className="text-slate-500 text-sm">{t("teacher_roster_empty")}</p>
            ) : (
              <ul className="divide-y divide-violet-100">
                {roster.map((s, i) => (
                  <li key={`${s.guest_id}-${i}`} className="py-3 flex justify-between items-center gap-4">
                    <div>
                      <div className="font-semibold">{s.display_name}</div>
                      <div className="text-xs text-slate-500">{s.room_name} · {s.room_code}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-violet-600">{t("teacher_ready_pct", { pct: s.readiness_percent })}</div>
                      <div className="text-xs text-slate-500">{t("teacher_due_tracks", { due: s.units_due, tracks: s.track_count })}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 rounded-3xl border-violet-100" data-testid="teacher-calendar-card">
          <CardHeader><CardTitle className="font-display">📅 {t("teacher_calendar")}</CardTitle></CardHeader>
          <CardContent>
            <CalendarView
              events={calendar.events}
              dailyLoad={calendar.daily_load}
              loading={calendarLoading}
              emptyHint={t("teacher_no_deadlines")}
            />
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.length === 0 && (
            <div className="text-slate-500 text-sm md:col-span-3">{t("teacher_no_raids")}</div>
          )}
          {rooms.map((r, i) => (
            <Card key={r.room_code} className="rounded-3xl border-violet-100 overflow-hidden">
              <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 p-4 text-white">
                <div className="text-xs uppercase tracking-widest text-white/80">{t("teacher_room_code")}</div>
                <div className="font-display text-3xl font-black tracking-widest" data-testid={`room-code-${i}`}>{r.room_code}</div>
              </div>
              <CardContent className="pt-4">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{r.mode} · {r.status || "waiting"}</div>
                {r.expires_at && (
                  <div className="text-xs text-amber-700 mt-1">
                    {t("teacher_expires", { date: new Date(r.expires_at).toLocaleString() })}
                    {r.status === "expired" && t("teacher_expired")}
                  </div>
                )}
                <Button
                  data-testid={`enter-raid-${i}`}
                  onClick={() => navigate(`/teacher/raid/${r.room_code}`)}
                  className="mt-3 w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {t("teacher_enter_raid")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
