import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/", icon: "home" },
  { label: "Meetings", to: "/meetings", icon: "calendar_month" },
  { label: "Analytics", to: "/analytics", icon: "bar_chart" },
  { label: "Members", to: "/members", icon: "group" },
];

function MobileNav() {
  const location = useLocation();

  return (
    <nav className="app-bottom-nav">
      {NAV_ITEMS.map((item) => {
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
            <span className="material-symbols-outlined text-[1.35rem]">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DesktopNav() {
  const location = useLocation();

  return (
    <header className="app-topbar">
      <div className="app-screen app-topbar__frame">
        <div className="app-brand">
          <div className="app-brand__icon">
            <span className="material-symbols-outlined text-[1.35rem]">
              record_voice_over
            </span>
          </div>
          <div>
            <p className="app-brand__eyebrow">Toastmasters Tracker</p>
            <p className="app-brand__name">Club Progress Dashboard</p>
          </div>
        </div>

        <nav className="app-topbar__nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
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
                <span className="material-symbols-outlined text-[1.1rem]">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
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
    </div>
  );
}
