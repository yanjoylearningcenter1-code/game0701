import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { disableKidMode } from "@/lib/kidMode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ASSETS } from "@/lib/design";
import { buildInviteShareText, shareText } from "@/lib/share";
import { purchasePremium, restorePurchases, isNativeIapAvailable, initIap } from "@/lib/iap";
import { toast } from "sonner";
import CalendarView from "@/components/CalendarView";
import { useLang } from "@/lib/i18n";

export default function ParentDashboard() {
  const { t } = useLang();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [followUps, setFollowUps] = useState({ due: [], upcoming: [], resolved: [] });
  const [emailPrefs, setEmailPrefs] = useState({ enabled: false, frequency: "weekly", email: "" });
  const [familyLinks, setFamilyLinks] = useState([]);
  const [linkCode, setLinkCode] = useState("");
  const [selectedKid, setSelectedKid] = useState("");
  const [orphaned, setOrphaned] = useState([]);
  const [parentGeminiKey, setParentGeminiKey] = useState(() => localStorage.getItem("parent_gemini_key") || "");
  const [calendar, setCalendar] = useState({ events: [], daily_load: [] });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [behavioralObs, setBehavioralObs] = useState(null);
  const [childDataLoading, setChildDataLoading] = useState(false);
  const [childTier, setChildTier] = useState("free");

  const hasLinkedChild = familyLinks.length > 0;

  useEffect(() => {
    disableKidMode();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      try {
        const [ep, fl, orph] = await Promise.all([
          api.get("/follow-ups/email-preferences"),
          api.get("/family-links"),
          api.get("/family-links/orphaned"),
        ]);
        setEmailPrefs(ep.data || { enabled: false, frequency: "weekly", email: user.email });
        const links = fl.data || [];
        setFamilyLinks(links);
        setOrphaned(orph.data || []);
        if (links.length === 1) setSelectedKid(links[0].kid_owner_id);
      } catch (err) {
        console.warn("parent dashboard load failed", err);
      }
    })();
  }, [loading, user, navigate]);

  useEffect(() => {
    if (loading || !user || !selectedKid) {
      setSessions([]);
      setMaterials([]);
      setTracks([]);
      setFollowUps({ due: [], upcoming: [], resolved: [] });
      setCalendar({ events: [], daily_load: [] });
      setBehavioralObs(null);
      return;
    }
    setChildDataLoading(true);
    setCalendarLoading(true);
    const params = { kid_owner_id: selectedKid };
    Promise.all([
      api.get("/game-sessions", { params }),
      api.get("/materials", { params }),
      api.get("/tracks", { params }),
      api.get("/follow-ups", { params }),
      api.get("/calendar", { params }),
      api.get("/parent/behavioral-observations", { params }),
    ])
      .then(([s, m, t, f, cal, obs]) => {
        setSessions(s.data || []);
        setMaterials(m.data || []);
        setTracks(t.data || []);
        setFollowUps(f.data || { due: [], upcoming: [], resolved: [] });
        setCalendar(cal.data || { events: [], daily_load: [] });
        setBehavioralObs(obs.data);
      })
      .catch((err) => console.warn("child data load failed", err))
      .finally(() => {
        setChildDataLoading(false);
        setCalendarLoading(false);
      });
    api.get("/parent/child-device", { params })
      .then((r) => setChildTier(r.data?.subscription_tier || "free"))
      .catch(() => setChildTier("free"));
  }, [loading, user, selectedKid]);

  const toggleChildPremium = async (tier) => {
    if (!selectedKid) return;
    try {
      await api.post("/parent/child-subscription", { kid_owner_id: selectedKid, subscription_tier: tier });
      setChildTier(tier);
      toast.success(tier === "premium" ? t("parent_premium_active") : t("parent_premium_free"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update subscription");
    }
  };

  const buyPremiumIap = async () => {
    if (!selectedKid) return;
    if (isNativeIapAvailable()) {
      await initIap(selectedKid);
      const r = await purchasePremium(selectedKid);
      if (r.ok) {
        setChildTier("premium");
        toast.success(t("parent_premium_active"));
      } else {
        toast.error(r.reason || "Purchase unavailable");
      }
      return;
    }
    await toggleChildPremium("premium");
  };

  const restoreIap = async () => {
    if (!selectedKid || !isNativeIapAvailable()) return;
    await initIap(selectedKid);
    const r = await restorePurchases(selectedKid);
    if (r.ok) {
      setChildTier("premium");
      toast.success(t("parent_premium_active"));
    }
  };

  const shareInvite = async () => {
    const id = selectedKid?.slice(-8) || "";
    const r = await shareText(buildInviteShareText(id));
    if (r === true || r === "copied") toast.success(t("share_invite_ok"));
  };

  const linkChild = async () => {
    if (!linkCode.trim()) return;
    try {
      await api.post("/family-links/by-code", { family_code: linkCode.trim() });
      toast.success(t("parent_link_ok"));
      setLinkCode("");
      const fl = await api.get("/family-links");
      const links = fl.data || [];
      setFamilyLinks(links);
      if (links.length === 1) setSelectedKid(links[0].kid_owner_id);
    } catch (err) {
      toast.error(err.response?.data?.detail || t("parent_link_fail"));
    }
  };

  const requestBehavioralConsent = async (kidOwnerId) => {
    try {
      await api.post("/consent/request", {
        kid_owner_id: kidOwnerId,
        parent_email: user.email,
        consent_type: "behavioral_signals",
      });
      toast.success(t("parent_consent_behavior_ok"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("parent_consent_fail"));
    }
  };

  const requestResearchConsent = async (kidOwnerId) => {
    try {
      await api.post("/consent/request", {
        kid_owner_id: kidOwnerId,
        consent_type: "research_sharing",
        parent_email: user.email,
      });
      toast.success(t("parent_consent_research_ok"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("parent_assign_need_link"));
    }
  };

  const assignHomework = () => {
    if (!hasLinkedChild) {
      toast.error(t("parent_assign_need_link"));
      return;
    }
    if (!selectedKid) {
      toast.error(t("parent_assign_pick_child"));
      return;
    }
    sessionStorage.removeItem("quick_battle");
    sessionStorage.setItem("assign_flow", "parent");
    sessionStorage.setItem("assign_student_id", selectedKid);
    navigate("/upload");
  };

  const saveParentGeminiKey = () => {
    const k = parentGeminiKey.trim();
    if (k) {
      localStorage.setItem("parent_gemini_key", k);
      toast.success(t("parent_gemini_saved"));
    } else {
      localStorage.removeItem("parent_gemini_key");
      toast.success(t("parent_gemini_removed"));
    }
  };

  const saveEmailPrefs = async (next) => {
    setEmailPrefs(next);
    try {
      await api.post("/follow-ups/email-preferences", next);
    } catch {
      console.warn("email prefs save failed");
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">{t("parent_loading")}</div>;
  }

  const totalScore = sessions.reduce((a, s) => a + (s.score || 0), 0);
  const totalRaids = sessions.length;
  const accuracy = (() => {
    const c = sessions.reduce((a, s) => a + (s.correct || 0), 0);
    const w = sessions.reduce((a, s) => a + (s.wrong || 0), 0);
    return c + w === 0 ? 0 : Math.round((c / (c + w)) * 100);
  })();

  const selectedLink = familyLinks.find((l) => l.kid_owner_id === selectedKid);

  return (
    <div className="min-h-screen bg-amber-50/40" data-testid="parent-dashboard">
      <header className="bg-white border-b border-amber-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={ASSETS.parent} alt="" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <div className="font-display font-bold text-slate-900">{t("parent_title")}</div>
              <div className="text-xs text-slate-500">{t("parent_welcome", { name: user.name })}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="upload-from-dash-btn"
              onClick={assignHomework}
              disabled={!hasLinkedChild}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
            >
              📸 {t("parent_assign")}
            </Button>
            <Button data-testid="logout-btn" variant="outline" onClick={async () => { await logout(); navigate("/"); }} className="rounded-xl">{t("parent_logout")}</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-display text-4xl font-bold text-slate-900">{t("parent_journey_title")}</h1>
        <p className="text-slate-600 mt-2">{t("parent_journey_sub")}</p>

        <Card className="mt-6 rounded-3xl border-amber-100" data-testid="link-child-card">
          <CardHeader><CardTitle className="font-display">👨‍👩‍👧 {t("parent_link_title")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{t("parent_link_steps")}</p>
            <div className="flex gap-2">
              <Input
                placeholder="482913"
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="rounded-xl font-mono text-lg tracking-widest"
                data-testid="family-code-input"
              />
              <Button onClick={linkChild} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white">{t("parent_link_btn")}</Button>
            </div>
            {hasLinkedChild && (
              <div className="space-y-2">
                <Label>{t("parent_linked_label")}</Label>
                <Select value={selectedKid} onValueChange={setSelectedKid}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("parent_select_child")} /></SelectTrigger>
                  <SelectContent>
                    {familyLinks.map((l) => (
                      <SelectItem key={l.link_id} value={l.kid_owner_id}>
                        {l.kid_device_id ? t("parent_device_suffix", { id: String(l.kid_device_id).slice(-6) }) : l.kid_owner_id}
                        {l.track_count != null ? ` · ${t("parent_tracks_count", { n: l.track_count })}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!hasLinkedChild && (
              <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">{t("parent_not_linked")}</p>
            )}
            {orphaned.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3">{t("parent_orphan", { count: orphaned.length })}</p>
            )}
          </CardContent>
        </Card>

        {hasLinkedChild && selectedKid && (
          <Card className="mt-6 rounded-3xl border-amber-200" data-testid="parent-premium-card">
            <CardHeader><CardTitle className="font-display">💎 {t("parent_premium_title")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{t("parent_premium_sub")}</p>
              <p className="text-sm font-semibold text-slate-800">
                {childTier === "premium" ? t("parent_premium_active") : t("parent_premium_free")}
              </p>
              {childTier === "premium" ? (
                <Button variant="outline" className="rounded-xl" onClick={() => toggleChildPremium("free")}>{t("parent_premium_downgrade")}</Button>
              ) : (
                <>
                  <Button className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={buyPremiumIap}>
                    {isNativeIapAvailable() ? t("parent_iap_buy") : t("parent_premium_upgrade")}
                  </Button>
                  {isNativeIapAvailable() && (
                    <Button variant="outline" className="rounded-xl" onClick={restoreIap}>{t("parent_iap_restore")}</Button>
                  )}
                </>
              )}
              <Button variant="outline" className="rounded-xl w-full" onClick={shareInvite} data-testid="parent-share-invite">
                📣 {t("share_invite")}
              </Button>
              <p className="text-xs text-slate-500">{t("parent_premium_iap_note")}</p>
            </CardContent>
          </Card>
        )}

        {!hasLinkedChild ? (
          <Card className="mt-8 rounded-3xl border-amber-100 bg-amber-50/30">
            <CardContent className="py-10 text-center text-slate-600">
              <div className="text-4xl mb-3">🔗</div>
              <p className="font-display font-bold text-lg text-slate-800">{t("parent_link_first")}</p>
              <p className="text-sm mt-2 max-w-md mx-auto">{t("parent_link_first_sub")}</p>
            </CardContent>
          </Card>
        ) : !selectedKid ? (
          <Card className="mt-8 rounded-3xl border-amber-100 bg-sky-50/30">
            <CardContent className="py-10 text-center text-slate-600">
              <p className="font-display font-bold text-lg text-slate-800">{t("parent_select_first")}</p>
              <p className="text-sm mt-2">{t("parent_select_first_sub")}</p>
            </CardContent>
          </Card>
        ) : childDataLoading ? (
          <div className="mt-8 text-center text-slate-500 py-12">{t("parent_loading")}</div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: t("parent_score"), value: totalScore, color: "from-amber-400 to-amber-600", emoji: "💎" },
                { label: t("parent_raids"), value: totalRaids, color: "from-sky-400 to-blue-600", emoji: "⚔" },
                { label: t("parent_accuracy"), value: `${accuracy}%`, color: "from-emerald-400 to-emerald-600", emoji: "🎯" },
              ].map((s) => (
                <div key={s.label} className={`rounded-3xl p-6 bg-gradient-to-br ${s.color} text-white shadow-lg`}>
                  <div className="text-3xl mb-2">{s.emoji}</div>
                  <div className="font-display text-3xl font-bold">{s.value}</div>
                  <div className="text-sm uppercase tracking-wider text-white/85">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="rounded-3xl lg:col-span-2 border-amber-100">
                <CardHeader><CardTitle className="font-display">📜 {t("parent_recent")}</CardTitle></CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="text-slate-500 text-sm">{t("parent_no_sessions")}</p>
                  ) : (
                    <ul className="divide-y divide-amber-100">
                      {sessions.slice(0, 8).map((s) => (
                        <li key={s.session_id || s.completed_at} className="py-3 flex justify-between items-center">
                          <div>
                            <div className="font-semibold capitalize">{s.mode}</div>
                            <div className="text-xs text-slate-500">{new Date(s.completed_at).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display font-bold text-amber-600">{s.score} {t("parent_score_pts")}</div>
                            <div className="text-xs text-slate-500">x{s.max_combo} combo · {s.correct}/{(s.correct||0)+(s.wrong||0)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-amber-100">
                <CardHeader><CardTitle className="font-display">🧠 {t("parent_ai_tip")}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-slate-700">
                    {accuracy < 60
                      ? t("parent_tip_low")
                      : totalRaids === 0
                      ? t("parent_tip_none")
                      : t("parent_tip_good")}
                  </p>
                  <Button data-testid="ai-suggestion-go-btn" onClick={assignHomework} className="mt-4 w-full rounded-2xl bg-amber-500 hover:bg-amber-600 text-white">{t("parent_start")}</Button>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-8 rounded-3xl border-violet-100" data-testid="behavioral-observations-card">
              <CardHeader><CardTitle className="font-display">📊 {t("parent_behavior_title")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">{t("parent_behavior_sub")}</p>
                {behavioralObs?.consent_required ? (
                  <Button variant="outline" className="rounded-xl" onClick={() => requestBehavioralConsent(selectedKid)}>
                    {t("parent_behavior_enable")}
                  </Button>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">{behavioralObs?.disclaimer}</p>
                    {(behavioralObs?.observations || []).length === 0 ? (
                      <p className="text-sm text-slate-500">{t("parent_behavior_empty")}</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {behavioralObs.observations.map((o) => (
                          <li key={o.game_type} className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                            <div className="font-semibold text-violet-800">{t("parent_behavior_sample", { type: o.game_type, n: o.sample_count })}</div>
                            <div className="text-xs text-slate-600 mt-1">
                              {t("parent_behavior_reaction", {
                                ms: o.avg_reaction_time_ms,
                                hints: o.avg_hint_usage,
                                replays: o.avg_replay_count,
                              })}
                            </div>
                            {o.pattern_note && (
                              <div className="text-xs text-violet-700 mt-1">{o.pattern_note}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="mt-8 rounded-3xl border-amber-100" data-testid="research-consent-card">
              <CardHeader><CardTitle className="font-display">🔬 {t("parent_research_title")}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3">{t("parent_research_sub")}</p>
                <Button variant="outline" className="rounded-xl" onClick={() => requestResearchConsent(selectedKid)}>
                  {t("parent_research_btn")}
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-8 rounded-3xl border-amber-100">
              <CardHeader><CardTitle className="font-display">📋 {t("parent_tracks")}</CardTitle></CardHeader>
              <CardContent>
                {tracks.length === 0 ? (
                  <p className="text-slate-500 text-sm">{t("parent_no_tracks")}</p>
                ) : (
                  <ul className="divide-y divide-amber-100">
                    {tracks.map((tr) => (
                      <li key={tr.track_id} className="py-3 flex items-center justify-between gap-4" data-testid={`track-${tr.track_id}`}>
                        <div className="min-w-0">
                          <div className="font-semibold capitalize">{tr.track_type.replace("_", " ")} — {tr.scope_description || t("parent_track_unnamed")}</div>
                          <div className="text-xs text-slate-500">
                            {tr.due_date ? t("parent_track_due", { date: new Date(tr.due_date).toLocaleDateString() }) : t("parent_track_no_due")} · {t("parent_track_units", { n: tr.unit_count })}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display font-bold text-emerald-600">{tr.readiness_percent}%</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider">{t("parent_readiness_label")}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="mt-8 rounded-3xl border-amber-100" data-testid="parent-calendar-card">
              <CardHeader><CardTitle className="font-display">📅 {t("parent_calendar")}</CardTitle></CardHeader>
              <CardContent>
                <CalendarView
                  events={calendar.events}
                  dailyLoad={calendar.daily_load}
                  loading={calendarLoading}
                  emptyHint={t("parent_calendar_empty")}
                />
              </CardContent>
            </Card>

            {(followUps.due.length > 0 || followUps.upcoming.length > 0) && (
              <Card className="mt-8 rounded-3xl border-amber-100">
                <CardHeader><CardTitle className="font-display">🔁 {t("parent_followup_title")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {followUps.due.map((f) => {
                    const tr = tracks.find((x) => x.track_id === f.track_id);
                    return (
                      <div key={f.follow_up_id} className="rounded-2xl bg-rose-50 border border-rose-200 p-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-rose-700">⏰ {t("parent_followup_due")}</div>
                          <div className="text-xs text-slate-500">{tr ? tr.scope_description || t("parent_track_unnamed") : f.track_id}</div>
                        </div>
                        <Button size="sm" onClick={assignHomework} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white">{t("parent_remind_child")}</Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card className="mt-8 rounded-3xl border-amber-100">
              <CardHeader><CardTitle className="font-display">📚 {t("parent_materials")}</CardTitle></CardHeader>
              <CardContent>
                {materials.length === 0 ? (
                  <p className="text-slate-500 text-sm">{t("parent_materials_empty")}</p>
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {materials.map((m) => (
                      <li key={m.material_id} className="rounded-2xl bg-amber-50/50 border border-amber-100 p-3">
                        <div className="font-semibold">{m.title}</div>
                        <div className="text-xs text-slate-500 truncate">{(m.text || "").slice(0, 90)}…</div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Card className="mt-8 rounded-3xl border-amber-100" data-testid="email-prefs-card">
          <CardHeader><CardTitle className="font-display">📧 {t("parent_email_prefs")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled">{t("parent_email_send")}</Label>
              <Switch
                id="email-enabled"
                checked={emailPrefs.enabled}
                onCheckedChange={(enabled) => saveEmailPrefs({ ...emailPrefs, enabled })}
              />
            </div>
            <Select
              value={emailPrefs.frequency}
              onValueChange={(frequency) => saveEmailPrefs({ ...emailPrefs, frequency })}
            >
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("parent_email_daily")}</SelectItem>
                <SelectItem value="weekly">{t("parent_email_weekly")}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="mt-8 rounded-3xl border-violet-100">
          <CardHeader><CardTitle className="font-display">🔑 {t("parent_gemini_key")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>{t("parent_gemini_hint")}</p>
            <Input
              type="password"
              placeholder={t("parent_gemini_placeholder")}
              value={parentGeminiKey}
              onChange={(e) => setParentGeminiKey(e.target.value)}
              className="rounded-xl font-mono text-xs"
              data-testid="parent-gemini-key-input"
            />
            <Button onClick={saveParentGeminiKey} variant="outline" className="rounded-xl">{t("parent_gemini_save")}</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
