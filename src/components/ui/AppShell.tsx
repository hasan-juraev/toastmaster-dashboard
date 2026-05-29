import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../hooks/useProfile";
import { useQuery } from "@tanstack/react-query";

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
  { label: "Meetings", to: "/meetings", icon: "calendar_month" },
  { label: "Analytics", to: "/analytics", icon: "bar_chart" },
  { label: "Members", to: "/members", icon: "group" },
];

const MEMBER_NAV: NavItem[] = [
  { label: "Home", to: "/", icon: "home" },
  { label: "Meetings", to: "/meetings", icon: "calendar_month" },
  { label: "My Role", to: "/role-signup", icon: "assignment_ind" },
  { label: "Analytics", to: "/analytics", icon: "bar_chart" },
];

function useNextMeetingId() {
  return useQuery<string | null>({
    queryKey: ["next_meeting_id_nav"],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings")
        .select("id")
        .eq("status", "upcoming")
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    },
  });
}

function SignOutButton({ mobile }: { mobile?: boolean }) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (mobile) {
    return (
      <button
        onClick={handleSignOut}
        className="app-bottom-nav__item text-app-text-muted"
      >
        <span className="material-symbols-outlined text-[1.35rem]">logout</span>
        <span>Sign Out</span>
      </button>
    );
  }

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

function RoleSignupNavItem({ mobile }: { mobile?: boolean }) {
  const { memberId } = useProfile();
  const { data: nextMeetingId } = useNextMeetingId();
  const location = useLocation();

  const to =
    memberId && nextMeetingId ? `/my-role/${nextMeetingId}` : "/role-signup";

  const isActive =
    location.pathname.startsWith("/my-role") ||
    location.pathname.startsWith("/role-signup");

  if (mobile) {
    return (
      <Link
        to={to}
        className={clsx("app-bottom-nav__item", isActive && "is-active")}
      >
        <span className="material-symbols-outlined text-[1.35rem]">
          assignment_ind
        </span>
        <span>My Role</span>
      </Link>
    );
  }

  return (
    <Link to={to} className={clsx("app-topbar__item", isActive && "is-active")}>
      <span className="material-symbols-outlined text-[1.1rem]">
        assignment_ind
      </span>
      <span>My Role</span>
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
        if (!isAdmin && item.label === "My Role") {
          return <RoleSignupNavItem key={item.to} mobile />;
        }

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
      <SignOutButton mobile />
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
            <p className="app-brand__name">Progress Dashboard</p>
          </div>
        </div>

        <nav className="app-topbar__nav" aria-label="Primary">
          {navItems.map((item) => {
            if (!isAdmin && item.label === "My Role") {
              return <RoleSignupNavItem key={item.to} />;
            }

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
          <SignOutButton />
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
