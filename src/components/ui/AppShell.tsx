import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";
import { OfflineBanner } from "./OfflineBanner";
import { useSWUpdate } from "../../hooks/useSWUpdate";
import { usePWAInstall } from "../../hooks/usePWAInstall";

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Home", to: "/", icon: "home" },
  { label: "Sessions", to: "/meetings", icon: "calendar_month" },
  { label: "Members", to: "/members", icon: "groups" },
  { label: "Analytics", to: "/analytics", icon: "bar_chart" },
];

const MEMBER_NAV: NavItem[] = [
  { label: "Home", to: "/", icon: "home" },
  { label: "Sessions", to: "/meetings", icon: "calendar_month" },
  { label: "Stats", to: "/analytics", icon: "bar_chart" },
];

function SignOutButton() {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };
  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-app-text-muted transition hover:bg-app-panel-soft hover:text-app-text"
    >
      <span className="material-symbols-outlined text-[1.1rem]">logout</span>
      <span>Sign Out</span>
    </button>
  );
}

function ProfileNavItem({ mobile }: { mobile?: boolean }) {
  const { memberId } = useProfile();
  const location = useLocation();
  const to = memberId ? `/members/${memberId}` : "/members";
  const isActive = location.pathname.startsWith("/members");

  if (mobile) {
    return (
      <Link
        to={to}
        className={clsx("app-bottom-nav__item", isActive && "is-active")}
      >
        <span
          className={clsx(
            "material-symbols-outlined text-[1.35rem]",
            isActive && "icon-filled",
          )}
        >
          person
        </span>
        <span>Profile</span>
      </Link>
    );
  }

  return (
    <Link to={to} className={clsx("app-topbar__item", isActive && "is-active")}>
      <span
        className={clsx(
          "material-symbols-outlined text-[1.1rem]",
          isActive && "icon-filled",
        )}
      >
        person
      </span>
      <span>Profile</span>
    </Link>
  );
}

function MobileNav() {
  const location = useLocation();
  const { isAdmin } = useProfile();

  const navItems = isAdmin ? ADMIN_NAV : MEMBER_NAV;

  return (
    <nav className="app-bottom-nav">
      {navItems.map((item) => {
        const isActive =
          item.to === "/"
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

        return (
          <Link
            key={item.to}
            to={item.to}
            className={clsx("app-bottom-nav__item", isActive && "is-active")}
          >
            <span
              className={clsx(
                "material-symbols-outlined text-[1.35rem]",
                isActive && "icon-filled",
              )}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <ProfileNavItem mobile />
    </nav>
  );
}

function DesktopNav() {
  const location = useLocation();
  const { isAdmin } = useProfile();

  const navItems = isAdmin ? ADMIN_NAV : MEMBER_NAV;

  return (
    <header className="app-topbar">
      <div className="app-screen app-topbar__frame">
        <div className="app-brand">
          <div>
            <p className="app-brand__name">Progress Tracker</p>
          </div>
        </div>

        <nav className="app-topbar__nav" aria-label="Primary">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsx("app-topbar__item", isActive && "is-active")}
              >
                <span
                  className={clsx(
                    "material-symbols-outlined text-[1.1rem]",
                    isActive && "icon-filled",
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <ProfileNavItem />
        </nav>

        <SignOutButton />
      </div>
    </header>
  );
}

function SWUpdateToast() {
  const { needRefresh, update } = useSWUpdate();
  if (!needRefresh) return null;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: "calc(5rem + env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.65rem 1rem",
        borderRadius: "9999px",
        fontSize: "0.82rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: "rgb(var(--color-app-panel))",
        border: "1px solid rgb(var(--color-app-border))",
        boxShadow: "0 4px 20px rgba(15,23,42,0.16)",
        color: "rgb(var(--color-app-text))",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "rgb(var(--color-primary))" }}>
        system_update
      </span>
      New version available
      <button
        onClick={update}
        style={{
          marginLeft: "0.25rem",
          padding: "0.3rem 0.75rem",
          borderRadius: "9999px",
          background: "rgb(var(--color-primary))",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: "0.8rem",
          fontWeight: 700,
        }}
      >
        Update
      </button>
    </div>
  );
}

function InstallPrompt() {
  const { canInstall, install, isIOS } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (!canInstall && !isIOS)) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(5rem + env(safe-area-inset-bottom))",
        left: "1rem",
        right: "1rem",
        zIndex: 9997,
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.75rem 1rem",
        borderRadius: "1rem",
        background: "rgb(var(--color-app-panel))",
        border: "1px solid rgb(var(--color-app-border))",
        boxShadow: "0 4px 20px rgba(15,23,42,0.16)",
        color: "rgb(var(--color-app-text))",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "1.1rem", color: "rgb(var(--color-primary))", flexShrink: 0 }}
      >
        {isIOS ? "ios_share" : "download"}
      </span>
      <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>
        {isIOS
          ? <>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></>
          : "Install this app on your device"}
      </span>
      {!isIOS && (
        <button
          onClick={install}
          style={{
            marginLeft: "auto",
            padding: "0.3rem 0.85rem",
            borderRadius: "9999px",
            background: "rgb(var(--color-primary))",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          marginLeft: isIOS ? "auto" : "0.25rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgb(var(--color-app-text-subtle))",
          display: "flex",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>close</span>
      </button>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__glow app-shell__glow--top" />
      <div className="app-shell__glow app-shell__glow--bottom" />
      <DesktopNav />
      <main className="app-screen app-screen--content">{children}</main>
      <MobileNav />
      <OfflineBanner />
      <SWUpdateToast />
      <InstallPrompt />
    </div>
  );
}
