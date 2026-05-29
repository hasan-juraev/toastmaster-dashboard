import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ─── Club config ────────────────────────────────────────────────────────────
const CLUB_NAME = "GGLTM";
const APP_NAME = "Progress Tracker";
const APP_TAGLINE = "Track roles, speeches, and growth — all in one place.";

const FEATURES = [
  { icon: "calendar_month", label: "Session scheduling & management" },
  { icon: "groups", label: "Role assignments" },
  { icon: "bar_chart", label: "Personal progress & analytics" },
  { icon: "emoji_events", label: "Achievements & level system" },
];
// ────────────────────────────────────────────────────────────────────────────

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    navigate("/");
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-app-bg text-app-text">
      {/* ── Mobile ambient glow ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.13),transparent_65%)] md:hidden" />

      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        {/* ══════════════════════════════════════════════════
            LEFT — Branding panel (desktop only)
        ══════════════════════════════════════════════════ */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-10 md:flex md:w-[46%] lg:w-[42%] xl:w-[38%]"
          style={{ background: "rgb(10 18 38)" }}
        >
          {/* Glow blobs */}
          <div
            className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.5), transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.6), transparent 70%)",
              filter: "blur(80px)",
            }}
          />

          {/* Brand mark */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(59,130,246,0.2)",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ color: "rgb(147 197 253)" }}
                >
                  trending_up
                </span>
              </div>
              <div>
                <p
                  className="text-[0.65rem] font-bold uppercase tracking-[0.26em]"
                  style={{ color: "rgba(147,197,253,0.8)" }}
                >
                  {CLUB_NAME}
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "rgb(248 250 252)" }}
                >
                  {APP_NAME}
                </p>
              </div>
            </div>
          </div>

          {/* Hero copy */}
          <div className="relative z-10 space-y-8">
            <div>
              <h2
                className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl"
                style={{ color: "rgb(248 250 252)" }}
              >
                Level up every
                <br />
                <span style={{ color: "rgb(147 197 253)" }}>session.</span>
              </h2>
              <p
                className="mt-4 text-base leading-relaxed"
                style={{ color: "rgba(148,163,184,0.9)" }}
              >
                {APP_TAGLINE}
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-3.5">
              {FEATURES.map((f) => (
                <li key={f.icon} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(59,130,246,0.15)",
                      border: "1px solid rgba(59,130,246,0.2)",
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ color: "rgb(147 197 253)" }}
                    >
                      {f.icon}
                    </span>
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: "rgba(203,213,225,0.85)" }}
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <p
            className="relative z-10 text-xs"
            style={{ color: "rgba(100,116,139,0.7)" }}
          >
            Members only · Contact admin to join
          </p>
        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT — Form panel
        ══════════════════════════════════════════════════ */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 md:px-12 lg:px-16">
          <div
            className="w-full max-w-sm"
            style={{ animation: "loginFadeUp 0.35s ease both" }}
          >
            {/* Mobile-only brand header */}
            <div className="mb-8 text-center md:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-primary/10">
                <span className="material-symbols-outlined text-2xl text-primary">
                  trending_up
                </span>
              </div>
              <p className="app-eyebrow mb-1">{CLUB_NAME}</p>
              <h1 className="text-[1.9rem] font-semibold tracking-tight text-app-text">
                {APP_NAME}
              </h1>
              <p className="mt-2 text-sm text-app-text-muted">{APP_TAGLINE}</p>
            </div>

            {/* Desktop heading */}
            <div className="mb-8 hidden md:block">
              <h1 className="text-2xl font-bold tracking-tight text-app-text lg:text-3xl">
                Welcome back
              </h1>
              <p className="mt-1.5 text-sm text-app-text-muted">
                Sign in to your {CLUB_NAME} account
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 rounded-2xl border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined mt-0.5 text-base text-app-danger">
                    error
                  </span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Form card */}
            <div className="rounded-3xl border border-app-border bg-app-panel/95 p-5 shadow-app-card backdrop-blur sm:p-6">
              <form className="space-y-4" onSubmit={handleLogin}>
                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-[0.16em] text-app-text-muted"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-app-text-subtle">
                      <span className="material-symbols-outlined text-lg">
                        mail_outline
                      </span>
                    </span>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-app-border bg-app-panel-soft py-3.5 pl-11 pr-4 text-base text-app-text placeholder:text-app-text-subtle transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-[0.16em] text-app-text-muted"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-[0.72rem] font-medium text-app-text-muted transition hover:text-primary"
                      title="Password reset is not configured yet."
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-app-text-subtle">
                      <span className="material-symbols-outlined text-lg">
                        lock
                      </span>
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-app-border bg-app-panel-soft py-3.5 pl-11 pr-12 text-base text-app-text placeholder:text-app-text-subtle transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-app-text-subtle transition hover:text-primary"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-semibold text-white shadow-[0_14px_32px_rgba(59,130,246,0.28)] transition hover:bg-primary/90 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{loading ? "Signing in…" : "Sign in"}</span>
                  <span className="material-symbols-outlined text-lg">
                    {loading ? "progress_activity" : "arrow_forward"}
                  </span>
                </button>
              </form>
            </div>

            {/* Footer */}
            {/* <p className="mt-6 text-center text-sm text-app-text-muted">
              New to the club?{" "}
              <button
                type="button"
                className="font-semibold text-primary transition hover:underline"
                title="Member signup is managed by club admins."
              >
                Contact an admin
              </button>
            </p> */}
          </div>
        </div>
      </div>

      {/* Entrance animation */}
      <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
