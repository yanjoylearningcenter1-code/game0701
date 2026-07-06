import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sfx } from "@/lib/audio";
import { useLang } from "@/lib/i18n";

const TABS = [
  { path: "/home", key: "nav_home", icon: "🏠", testId: "nav-home" },
  { path: "/upload", key: "nav_upload", icon: "📸", testId: "nav-upload", accent: true },
  { path: "/settings", key: "nav_store", icon: "🛒", testId: "nav-store" },
  { path: "/leaderboard", key: "nav_leaderboard", icon: "🏆", testId: "nav-leaderboard" },
  { path: "/profile", key: "nav_profile", icon: "🧒", testId: "nav-profile" },
];

export default function KidBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLang();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-md safe-area-pb"
      data-testid="kid-bottom-nav"
    >
      <div className="max-w-lg mx-auto flex items-stretch justify-around px-1 py-1.5">
        {TABS.map((tab) => {
          const active = pathname === tab.path || (tab.path === "/home" && pathname === "/");
          return (
            <button
              key={tab.path}
              type="button"
              data-testid={tab.testId}
              onClick={() => { sfx.click(); navigate(tab.path); }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-colors min-w-0 ${
                active
                  ? tab.accent
                    ? "text-amber-300"
                    : "text-sky-300"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              <span className={`text-xl leading-none ${tab.accent && active ? "scale-110" : ""}`}>{tab.icon}</span>
              <span className="text-[10px] font-bold mt-0.5 truncate w-full text-center">{t(tab.key)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Wrap kid hub pages — adds bottom padding so content isn't hidden behind nav. */
export function KidPageShell({ children, className = "" }) {
  return (
    <div className={`pb-20 ${className}`}>
      {children}
      <KidBottomNav />
    </div>
  );
}
