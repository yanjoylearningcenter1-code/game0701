import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Particles } from "@/lib/design";
import { shareText } from "@/lib/share";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sfx } from "@/lib/audio";
import { KidPageShell } from "@/components/KidBottomNav";
import { useLang } from "@/lib/i18n";

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [friendsData, setFriendsData] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0 });
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [adding, setAdding] = useState(false);

  const refresh = () => {
    Promise.allSettled([api.get("/friends"), api.get("/home-status")]).then(([fr, hs]) => {
      if (fr.status === "fulfilled") setFriendsData(fr.value.data);
      if (hs.status === "fulfilled") setStreak(hs.value.data?.streak || { current_streak: 0 });
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const me = friendsData?.me || { total_xp: 0, display_name: "Agent", public_user_id: "" };
  const friends = friendsData?.friends || [];
  const leaderboard = [
    { ...me, is_me: true },
    ...friends.map((f) => ({ ...f, is_me: false })),
  ].sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));

  const searchUser = async () => {
    const id = searchId.trim().toUpperCase();
    if (id.length < 4) return;
    try {
      const r = await api.get("/users/search", { params: { public_user_id: id } });
      setSearchResult(r.data);
    } catch (err) {
      setSearchResult(null);
      toast.error(err.response?.data?.detail || t("leaderboard_not_found"));
    }
  };

  const addFriend = async (publicUserId) => {
    setAdding(true);
    try {
      await api.post("/friends", { public_user_id: publicUserId });
      toast.success(t("leaderboard_added"));
      setSearchResult(null);
      setSearchId("");
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("leaderboard_add_fail"));
    } finally {
      setAdding(false);
    }
  };

  const inviteFriend = async () => {
    sfx.click();
    const idSuffix = me.public_user_id ? ` ID: ${me.public_user_id}` : "";
    const text = t("invite_text", {
      xp: me.total_xp || 0,
      days: streak.current_streak,
      id: idSuffix,
    });
    const r = await shareText(text);
    if (r === "copied") toast.success(t("leaderboard_copied"));
    else if (r) toast.success(t("leaderboard_shared"));
    else toast.info(t("leaderboard_copy_manual"));
  };

  return (
    <KidPageShell>
      <div className="relative min-h-screen bg-slate-950 text-white" data-testid="leaderboard-page">
        <Particles count={10} />
        <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
          <button onClick={() => navigate("/home")} className="text-sky-200/70 hover:text-white text-sm mb-4">← {t("nav_home")}</button>
          <h1 className="font-display text-3xl font-bold">🏆 {t("leaderboard_title")}</h1>
          <p className="text-sky-100/60 text-sm mt-1">
            {t("leaderboard_streak", { days: streak.current_streak, id: me.public_user_id || "…" })}
          </p>

          <div className="mt-6 rounded-3xl bg-gradient-to-br from-amber-500/15 to-orange-900/20 border border-amber-400/30 p-5 text-center">
            <div className="text-4xl mb-1">🥇</div>
            <div className="font-display text-3xl font-bold text-amber-200">{me.total_xp || 0} XP</div>
            <div className="text-xs text-white/50 mt-1">{me.display_name || t("adventurer")}</div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm font-bold mb-2">➕ {t("leaderboard_add_friend")}</div>
            <div className="flex gap-2">
              <Input
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                placeholder="ABC12XY9"
                className="rounded-xl bg-white/10 border-white/20 text-white font-mono"
                data-testid="friend-search-input"
              />
              <Button onClick={searchUser} className="rounded-xl shrink-0">{t("leaderboard_search")}</Button>
            </div>
            {searchResult && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-sky-500/10 border border-sky-400/20 p-3">
                <div>
                  <div className="font-bold">{searchResult.display_name}</div>
                  <div className="text-xs text-white/50 font-mono">{searchResult.public_user_id}</div>
                </div>
                <Button
                  size="sm"
                  disabled={adding}
                  onClick={() => addFriend(searchResult.public_user_id)}
                  className="rounded-lg"
                  data-testid="add-friend-btn"
                >
                  {t("leaderboard_add")}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2">
            {leaderboard.length <= 1 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-center text-sm text-white/50">
                {t("leaderboard_empty")}
              </div>
            ) : (
              leaderboard.map((row, i) => (
                <div
                  key={row.public_user_id || row.friend_id || i}
                  className={`rounded-2xl p-3 flex items-center justify-between border ${
                    row.is_me ? "bg-amber-500/10 border-amber-400/30" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white/40 w-6">{i + 1}</span>
                    <div>
                      <div className="font-bold">{row.display_name}{row.is_me ? t("leaderboard_you") : ""}</div>
                      {!row.is_me && row.public_user_id && (
                        <div className="text-xs text-white/40 font-mono">{row.public_user_id}</div>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-amber-200">{row.total_xp || 0} XP</div>
                </div>
              ))
            )}
          </div>

          <Button
            type="button"
            onClick={inviteFriend}
            className="w-full mt-8 rounded-2xl py-5 font-display font-bold bg-gradient-to-b from-sky-400 to-blue-600 text-white"
            data-testid="invite-friend-btn"
          >
            📤 {t("leaderboard_invite")}
          </Button>
        </div>
      </div>
    </KidPageShell>
  );
}
