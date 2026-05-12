import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-60 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_60%)] sm:h-72" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-start px-4 py-6 sm:px-6 sm:py-8 md:justify-center">
        <div className="mx-auto w-full max-w-[20rem] sm:max-w-sm">
          <div className="mb-7 pt-4 text-center sm:mb-10 sm:pt-0">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-app-card sm:mb-5 sm:h-16 sm:w-16">
              <span className="material-symbols-outlined text-[1.75rem] sm:text-[2rem]">
                record_voice_over
              </span>
            </div>
            <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-primary sm:text-xs sm:tracking-[0.28em]">
              Toastmasters Tracker
            </p>
            <h1 className="mx-auto max-w-[14rem] text-[1.95rem] font-semibold tracking-tight text-app-text sm:max-w-none sm:text-4xl md:text-[2.8rem]">
              Welcome Back
            </h1>
            <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-6 text-app-text-muted sm:max-w-none sm:text-base">
              Manage your club meetings, members, roles, and progress from a
              cleaner dashboard experience.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-app-border bg-app-panel/95 p-4 shadow-app-card backdrop-blur sm:rounded-[1.75rem] sm:p-6">
            {error ? (
              <div className="mb-4 rounded-2xl border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-base text-app-danger">
                    error
                  </span>
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-app-text-muted"
                >
                  Email Address
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
                    placeholder="name@club-domain.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-app-border bg-app-panel-soft py-3.5 pl-11 pr-4 text-base text-app-text placeholder:text-app-text-subtle sm:pl-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-[0.16em] text-app-text-muted"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[0.72rem] font-medium text-app-text-muted transition hover:text-primary sm:text-xs"
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
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-app-border bg-app-panel-soft py-3.5 pl-11 pr-11 text-base text-app-text placeholder:text-app-text-subtle sm:pl-12 sm:pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-app-text-subtle transition hover:text-primary sm:pr-4"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-base font-semibold text-white shadow-[0_18px_34px_rgba(59,130,246,0.24)] transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:py-4"
              >
                <span>{loading ? "Signing in..." : "Sign in"}</span>
                <span className="material-symbols-outlined text-lg">
                  {loading ? "progress_activity" : "arrow_forward"}
                </span>
              </button>
            </form>
          </div>

          <div className="mt-6 pb-3 text-center sm:mt-8 sm:pb-0">
            <p className="text-sm text-app-text-muted">
              New to the club?
              <button
                type="button"
                className="mt-1 block w-full font-semibold text-primary transition hover:underline sm:ml-1 sm:inline sm:w-auto"
                title="Member signup is outside the current app scope."
              >
                Contact an admin
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
