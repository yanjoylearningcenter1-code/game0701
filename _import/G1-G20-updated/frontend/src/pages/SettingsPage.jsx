import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sfx } from "@/lib/audio";
import { getListenMode, setListenMode } from "@/lib/listenMode";
import { getUiLang, setUiLang as persistUiLang, useLang } from "@/lib/i18n";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [parentEmail, setParentEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [uiLang, setUiLang] = useState(() => getUiLang());
  const [listenMode, setListenModeState] = useState(() => getListenMode());
  const [docLimits, setDocLimits] = useState(null);

  useEffect(() => {
    const syncLang = () => setUiLang(getUiLang());
    window.addEventListener("app-lang-changed", syncLang);
    return () => window.removeEventListener("app-lang-changed", syncLang);
  }, []);

  useEffect(() => {
    api.get("/profile/avatar").then((r) => setAvatar(r.data)).catch(() => {});
    api.get("/profile/me").then((r) => {
      setProfile(r.data);
      setDisplayName(r.data?.display_name || "");
    }).catch(() => {});
    api.get("/documents/limits").then((r) => setDocLimits(r.data)).catch(() => {});
    api.get("/student-preferences").then((r) => {
      const m = r.data?.listen_mode_default;
      if (m) { setListenMode(m); setListenModeState(m); }
    }).catch(() => {});
  }, []);

  const pickAvatar = async (skin) => {
    if (avatarBusy) return;
    sfx.click();
    const unlocked = avatar.unlocked_skins.includes(skin.skin_id);
    setAvatarBusy(skin.skin_id);
    try {
      if (!unlocked) {
        const r = await api.post("/profile/avatar/unlock", { skin_id: skin.skin_id });
        setAvatar((a) => ({ ...a, unlocked_skins: r.data.unlocked_skins, diamonds: r.data.diamonds }));
        toast.success(`${skin.emoji} ${skin.name} unlocked!`);
      }
      const eq = await api.post("/profile/avatar/equip", { skin_id: skin.skin_id });
      setAvatar((a) => ({ ...a, equipped_skin: eq.data.equipped_skin }));
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error(`Need ${skin.cost}💎 — you have ${avatar.diamonds}💎. Win more battles to earn diamonds!`);
      } else {
        toast.error("Couldn't update avatar — try again");
      }
    } finally {
      setAvatarBusy(null);
    }
  };

  const saveDisplayName = async () => {
    const name = displayName.trim();
    if (!name) return;
    setNameBusy(true);
    try {
      const r = await api.patch("/profile/display-name", { display_name: name });
      setProfile((p) => ({ ...p, display_name: r.data.display_name }));
      toast.success(t("settings_name_saved"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("settings_name_fail"));
    } finally {
      setNameBusy(false);
    }
  };

  const inviteParent = async () => {
    if (!parentEmail.trim()) return;
    setBusy(true);
    try {
      await api.post("/family-links/invite", { parent_email: parentEmail.trim() });
      setSent(true);
      toast.success(t("settings_invite_sent"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("settings_invite_fail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8" data-testid="settings-page">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-sky-200/70 hover:text-white text-sm mb-6">← {t("settings_back")}</button>
        <h1 className="font-display text-3xl font-bold mb-2">{t("settings_title")}</h1>
        <p className="text-sky-100/60 text-sm mb-8">{t("settings_app_prefs")}</p>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4" data-testid="display-name-setting">
            <div className="text-sm text-white/80 mb-1">{t("settings_nickname")}</div>
            <div className="text-xs text-white/50 mb-3">{t("settings_display_hint")}</div>
            <div className="flex gap-2 mb-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 24))}
                placeholder={t("adventurer")}
                className="rounded-xl bg-white/10 border-white/20 text-white"
                data-testid="display-name-input"
              />
              <Button
                onClick={saveDisplayName}
                disabled={nameBusy || !displayName.trim()}
                className="rounded-xl shrink-0"
              >
                {t("settings_save")}
              </Button>
            </div>
            {profile?.public_user_id && (
              <div className="text-xs text-sky-200/80 font-mono" data-testid="public-user-id">
                {t("settings_friend_id", { id: profile.public_user_id })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4" data-testid="avatar-picker">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-white/80">Your Avatar</div>
              {avatar && (
                <div className="text-xs font-bold text-cyan-200 flex items-center gap-1">
                  💎 {avatar.diamonds}
                </div>
              )}
            </div>
            <div className="text-xs text-white/50 mb-3">{t("settings_avatars")}</div>
            {!avatar ? (
              <div className="text-xs text-white/40">Loading…</div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {avatar.catalog.map((skin) => {
                  const unlocked = avatar.unlocked_skins.includes(skin.skin_id);
                  const equipped = avatar.equipped_skin === skin.skin_id;
                  return (
                    <button
                      key={skin.skin_id}
                      type="button"
                      data-testid={`avatar-skin-${skin.skin_id}`}
                      onClick={() => pickAvatar(skin)}
                      disabled={!!avatarBusy}
                      title={skin.name}
                      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 border-2 transition-all ${
                        equipped
                          ? "bg-amber-400/20 border-amber-300 shadow-[0_0_0_2px_rgba(251,191,36,0.4)]"
                          : unlocked
                            ? "bg-white/10 border-white/20 hover:border-sky-300"
                            : "bg-white/5 border-white/10 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <span className="text-2xl">{skin.emoji}</span>
                      {!unlocked && (
                        <span className="text-[10px] font-bold text-cyan-200">💎{skin.cost}</span>
                      )}
                      {equipped && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs bg-amber-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center font-bold">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4" data-testid="premium-info">
            <div className="text-sm text-white/80 mb-1">{t("settings_premium")}</div>
            <div className="text-xs text-white/50 mb-2">
              {docLimits?.subscription_tier === "premium"
                ? t("settings_premium_active")
                : t("settings_premium_free")}
            </div>
            {docLimits?.subscription_tier !== "premium" && (
              <div className="text-xs text-amber-200/80">{t("settings_premium_parent")}</div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm text-white/80 mb-2">{t("settings_volume")}</div>
            <div className="text-xs text-white/50">{t("settings_volume_hint")}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4" data-testid="listen-mode-setting">
            <div className="text-sm text-white/80 mb-1">{t("settings_listen")}</div>
            <div className="text-xs text-white/50 mb-3">{t("settings_listen_hint")}</div>
            <div className="flex gap-2">
              {[
                { id: "word", label: `🔤 ${t("settings_listen_word")}` },
                { id: "sentence", label: `📄 ${t("settings_listen_sentence")}` },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`listen-${opt.id}`}
                  onClick={async () => {
                    sfx.click();
                    setListenMode(opt.id);
                    setListenModeState(opt.id);
                    try {
                      await api.post("/student-preferences", { listen_mode_default: opt.id });
                      toast.success(opt.id === "word" ? "Listen: single word" : "Listen: full sentence");
                    } catch {
                      toast.error("Could not save preference");
                    }
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    listenMode === opt.id ? "bg-sky-400 text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/15"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4" data-testid="language-setting">
            <div className="text-sm text-white/80 mb-2">{t("settings_language")}</div>
            <div className="flex gap-2">
              {[
                { id: "en", label: t("settings_lang_en") },
                { id: "zh-HK", label: t("settings_lang_zh") },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`lang-${opt.id}`}
                  onClick={() => {
                    sfx.click();
                    setUiLang(opt.id);
                    persistUiLang(opt.id);
                    toast.success(`Language: ${opt.label}`);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    uiLang === opt.id
                      ? "bg-amber-400 text-slate-900"
                      : "bg-white/10 text-white/70 hover:bg-white/15"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/40 mt-2">{t("settings_lang_note")}</p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm text-white/80 mb-2">{t("settings_link_parent")}</div>
            {sent ? (
              <p className="text-sm text-sky-200/80">
                We've sent an email to your parent. They need to confirm before the link is active.
              </p>
            ) : (
              <>
                <Input
                  type="email"
                  placeholder="Parent's email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="rounded-xl bg-white/10 border-white/20 text-white mb-3"
                  data-testid="parent-email-input"
                />
                <Button
                  onClick={inviteParent}
                  disabled={busy || !parentEmail.trim()}
                  variant="outline"
                  className="w-full rounded-xl border-white/20 text-white hover:bg-white/10"
                  data-testid="invite-parent-btn"
                >
                  Send invite email
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
