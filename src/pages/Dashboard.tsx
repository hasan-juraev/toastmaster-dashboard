import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../app/AuthProvider";
import { useMembers } from "../hooks/useMembers";

const NAV_CARDS = [
  {
    to: "/members",
    icon: "group",
    label: "Members",
    description: "Manage club members and roles",
    accentBg: "#eff6ff",
    accentColor: "#3b82f6",
    disabled: false,
  },
  {
    to: "/meetings",
    icon: "event",
    label: "Meetings",
    description: "Schedule and record meetings",
    accentBg: "#f5f3ff",
    accentColor: "#7c3aed",
    disabled: false,
  },
  {
    to: "/analytics",
    icon: "bar_chart",
    label: "Reports",
    description: "View analytics & progress",
    accentBg: "#ecfdf5",
    accentColor: "#10b981",
    disabled: false,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: members } = useMembers();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const displayName = user?.email?.split("@")[0] ?? "there";
  const activeCount = members?.filter((m) => m.active).length ?? "—";
  const totalCount = members?.length ?? "—";

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#f8fafc",
        fontFamily: "'Inter', sans-serif",
        color: "#0f172a",
      }}
    >
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: "#fff",
          borderBottom: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{
              background: "#eff6ff",
              borderRadius: "0.75rem",
              border: "1px solid #bfdbfe",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "1.25rem", color: "#3b82f6" }}
            >
              record_voice_over
            </span>
          </div>
          <div>
            <div
              className="font-bold text-lg leading-none"
              style={{ color: "#0f172a" }}
            >
              Toastmasters
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              Club Dashboard
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span
              className="text-sm font-medium capitalize"
              style={{ color: "#0f172a" }}
            >
              {displayName}
            </span>
            <span className="text-xs" style={{ color: "#94a3b8" }}>
              {user?.email}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{
              padding: "0.5rem 0.75rem",
              color: "#ef4444",
              background: "transparent",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
            title="Sign out"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "1rem" }}
            >
              logout
            </span>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#0f172a" }}
          >
            Good to see you, <span className="capitalize">{displayName}</span>{" "}
            👋
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Here's what's happening in your club.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div
            className="p-5"
            style={{
              background: "#fff",
              borderRadius: "1rem",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "1rem", color: "#3b82f6" }}
              >
                person
              </span>
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "#94a3b8" }}
              >
                Active Members
              </span>
            </div>
            <p className="text-3xl font-bold" style={{ color: "#3b82f6" }}>
              {activeCount}
            </p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
              of {totalCount} total
            </p>
          </div>
          <div
            className="p-5"
            style={{
              background: "#fff",
              borderRadius: "1rem",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "1rem", color: "#7c3aed" }}
              >
                calendar_month
              </span>
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "#94a3b8" }}
              >
                Next Meeting
              </span>
            </div>
            <p className="text-3xl font-bold" style={{ color: "#7c3aed" }}>
              —
            </p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
              Check meetings page
            </p>
          </div>
        </div>

        {/* Nav cards */}
        <div
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: "#94a3b8" }}
        >
          Quick Actions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {NAV_CARDS.map((card) =>
            card.disabled ? (
              <div
                key={card.label}
                className="p-6"
                style={{
                  background: "#fff",
                  borderRadius: "1rem",
                  border: "1px solid #f1f5f9",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                <div
                  className="w-11 h-11 flex items-center justify-center mb-4"
                  style={{ background: card.accentBg, borderRadius: "0.75rem" }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "1.25rem", color: card.accentColor }}
                  >
                    {card.icon}
                  </span>
                </div>
                <div className="font-semibold" style={{ color: "#334155" }}>
                  {card.label}
                </div>
                <div className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                  {card.description}
                </div>
              </div>
            ) : (
              <Link
                key={card.label}
                to={card.to!}
                className="group block p-6 transition-all duration-200"
                style={{
                  background: "#fff",
                  borderRadius: "1rem",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  textDecoration: "none",
                  color: "inherit",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.04)";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(0)";
                }}
              >
                <div
                  className="w-11 h-11 flex items-center justify-center mb-4"
                  style={{ background: card.accentBg, borderRadius: "0.75rem" }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "1.25rem", color: card.accentColor }}
                  >
                    {card.icon}
                  </span>
                </div>
                <div className="font-semibold" style={{ color: "#0f172a" }}>
                  {card.label}
                </div>
                <div className="text-xs mt-1" style={{ color: "#64748b" }}>
                  {card.description}
                </div>
                <div
                  className="mt-4 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#3b82f6" }}
                >
                  Open
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "0.875rem" }}
                  >
                    arrow_forward
                  </span>
                </div>
              </Link>
            ),
          )}
        </div>
      </main>
    </div>
  );
}
