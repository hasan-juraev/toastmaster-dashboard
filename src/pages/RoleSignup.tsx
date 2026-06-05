import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useOpenMeetingRoles, useClaimMeetingRole, useUnclaimMeetingRole } from "../hooks/useRoles";
import { useProfile } from "../hooks/useProfile";
import { AppShell } from "../components/ui/AppShell";
import type { Meeting } from "../types/database";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export default function RoleSignup() {
  const [searchParams] = useSearchParams();
  const { memberId } = useProfile();

  // Fetch next upcoming meeting if no meetingId param
  const { data: nextMeeting } = useQuery<Meeting | null>({
    queryKey: ["next_meeting"],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("status", "upcoming")
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !searchParams.get("meetingId"),
  });

  const meetingId = searchParams.get("meetingId") ?? nextMeeting?.id ?? "";

  const { data: meeting } = useQuery<Meeting | null>({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .single();
      return data ?? null;
    },
    enabled: !!meetingId,
  });

  const { data: roles = [], isLoading } = useOpenMeetingRoles(meetingId);
  const claimRole = useClaimMeetingRole();
  const unclaimRole = useUnclaimMeetingRole();

  const myRole = roles.find((r) => r.member_id === memberId);

  const handleClaim = async (roleId: string) => {
    try {
      await claimRole.mutateAsync(roleId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Role is no longer available.");
    }
  };

  const handleUnclaim = async (roleId: string) => {
    try {
      await unclaimRole.mutateAsync({ meetingRoleId: roleId, meetingId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to withdraw from role.");
    }
  };

  return (
    <AppShell>
      <section className="space-y-6 pt-8 pb-6 md:space-y-8 md:pt-10">
        <div>
          <p className="app-eyebrow">Sign Up</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-app-text md:text-[3rem]">
            Role Signup
          </h1>
          {meeting && (
            <p className="mt-2 text-base text-app-text-muted">
              {formatDate(meeting.date)}
              {meeting.theme ? ` — ${meeting.theme}` : ""}
            </p>
          )}
        </div>

        {myRole && (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-sm font-semibold text-emerald-700">
              You are signed up as{" "}
              <span className="font-bold">{myRole.roles?.name ?? "a role"}</span>.
            </p>
            {meetingId && (
              <Link
                to={`/my-role/${meetingId}`}
                className="mt-1 inline-block text-sm font-medium text-emerald-600 underline-offset-2 hover:underline"
              >
                Go to My Role Dashboard →
              </Link>
            )}
          </div>
        )}

        {!meetingId ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            No upcoming meeting found.
          </div>
        ) : isLoading ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            Loading roles…
          </div>
        ) : roles.length === 0 ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            No roles found for this meeting.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => {
              const isMyRole = role.member_id === memberId;
              const isClaimed = !!role.member_id;
              const isPending =
                (claimRole.isPending && claimRole.variables === role.id) ||
                (unclaimRole.isPending && unclaimRole.variables?.meetingRoleId === role.id);

              return (
                <div
                  key={role.id}
                  className={`flex flex-col gap-4 rounded-[1.5rem] border p-5 ${
                    isMyRole
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-app-border bg-app-panel"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-app-text">
                        {role.roles?.name ?? "Unknown Role"}
                      </p>
                      {isClaimed ? (
                        <p className="mt-1 text-sm text-app-text-muted">
                          {isMyRole ? "You" : role.members?.name ?? "Claimed"}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-app-text-muted">Open</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isMyRole
                          ? "bg-emerald-100 text-emerald-700"
                          : isClaimed
                            ? "bg-app-panel-soft text-app-text-muted"
                            : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {isMyRole ? "Your role" : isClaimed ? "Taken" : "Open"}
                    </span>
                  </div>

                  {isMyRole ? (
                    <button
                      onClick={() => handleUnclaim(role.id)}
                      disabled={isPending}
                      className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {isPending ? "Withdrawing…" : "Withdraw"}
                    </button>
                  ) : isClaimed ? (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-app-border bg-app-panel-soft px-4 py-2.5 text-sm font-semibold text-app-text-muted opacity-60"
                    >
                      Taken
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClaim(role.id)}
                      disabled={isPending || !!myRole}
                      className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isPending ? "Signing up…" : "Sign Up"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-app-text-subtle">
          Role slots update in real time.
        </p>
      </section>
    </AppShell>
  );
}
