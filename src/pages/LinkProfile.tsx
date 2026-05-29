import { useState } from "react";
import { useMembers } from "../hooks/useMembers";
import { useAuth } from "../app/AuthContext";
import { supabase } from "../lib/supabase";

export default function LinkProfile() {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useMembers();

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeMembers = members.filter((m) => m.active);

  const handleSave = async () => {
    if (!selectedMemberId) {
      setError("Please select your name from the list.");
      return;
    }
    if (!user) return;

    setSaving(true);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ member_id: selectedMemberId })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Force a full reload so AuthProvider re-fetches the profile
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link profile.");
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-app-border bg-app-panel p-8 shadow-app-card">
        <p className="app-eyebrow">Welcome</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-app-text">
          Link your profile
        </h1>
        <p className="mt-3 text-sm text-app-text-muted">
          Select your name from the members list to link your account. This lets
          the app track your roles and contributions.
        </p>

        <div className="mt-8 space-y-4">
          {isLoading ? (
            <p className="text-sm text-app-text-muted">Loading members…</p>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                Your name
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select your name…</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,130,246,0.24)] transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Linking…" : "Link my profile"}
          </button>

          <p className="text-center text-xs text-app-text-subtle">
            Not in the list?{" "}
            <span className="text-app-text-muted">
              Ask your club admin to add you as a member first.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
