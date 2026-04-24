import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="max-w-md mx-auto min-h-screen flex flex-col px-6">
        <div className="flex-1 flex flex-col justify-center mt-12 mb-8">
          {/* Logo & heading */}
          <div className="flex flex-col items-center mb-10">
            <div
              className="w-20 h-20 flex items-center justify-center mb-6"
              style={{
                background: "#eff6ff",
                borderRadius: "2rem",
                border: "1px solid #bfdbfe",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "2.5rem", color: "#3b82f6" }}
              >
                record_voice_over
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-center text-slate-900">
              Welcome back
            </h1>
            <p className="text-slate-500 mt-2 text-center text-sm">
              Sign in to track your speaking journey
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mb-5 flex items-start gap-3 px-4 py-3 text-sm"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                borderRadius: "1rem",
              }}
            >
              <span
                className="material-symbols-outlined text-base mt-0.5 shrink-0"
                style={{ fontSize: "1rem" }}
              >
                error
              </span>
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium text-slate-700 mb-1.5"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span
                    className="material-symbols-outlined text-slate-400"
                    style={{ fontSize: "1.1rem" }}
                  >
                    mail
                  </span>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2"
                  style={{
                    padding: "0.875rem 0.75rem 0.875rem 2.5rem",
                    background: "#f8fafc",
                    borderRadius: "1rem",
                    border: "none",
                    fontSize: "0.875rem",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium text-slate-700 mb-1.5"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span
                    className="material-symbols-outlined text-slate-400"
                    style={{ fontSize: "1.1rem" }}
                  >
                    lock
                  </span>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2"
                  style={{
                    padding: "0.875rem 2.5rem 0.875rem 2.5rem",
                    background: "#f8fafc",
                    borderRadius: "1rem",
                    border: "none",
                    fontSize: "0.875rem",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span
                    className="material-symbols-outlined text-slate-400 hover:text-slate-600"
                    style={{ fontSize: "1.1rem" }}
                  >
                    {showPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <a
                href="#"
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: "#3b82f6" }}
              >
                Forgot password?
              </a>
            </div>

            {/* Sign in button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{
                  padding: "1rem",
                  background: "#3b82f6",
                  borderRadius: "1rem",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#2563eb";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#3b82f6";
                }}
              >
                {loading && (
                  <span
                    className="material-symbols-outlined animate-spin"
                    style={{ fontSize: "1rem" }}
                  >
                    progress_activity
                  </span>
                )}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div
                  className="w-full"
                  style={{ borderTop: "1px solid #e2e8f0" }}
                />
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className="px-3 bg-white text-slate-500"
                  style={{ fontSize: "0.875rem" }}
                >
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social buttons */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                title="Google sign-in coming soon"
                className="w-full flex justify-center items-center transition-colors"
                style={{
                  padding: "0.625rem 1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  background: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  cursor: "pointer",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fff")
                }
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                title="Apple sign-in coming soon"
                className="w-full flex justify-center items-center transition-colors"
                style={{
                  padding: "0.625rem 1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  background: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  cursor: "pointer",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fff")
                }
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ flexShrink: 0, color: "#000" }}
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.75 3.58-.76 1.44-.06 2.5.53 3.33 1.34-2.88 1.74-2.4 5.53.53 6.64-1.04 2.54-1.57 3.8-2.52 4.95zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Apple
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="py-6 mt-auto"
          style={{ borderTop: "1px solid #f1f5f9" }}
        >
          <p className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <a
              href="#"
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: "#3b82f6" }}
            >
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
