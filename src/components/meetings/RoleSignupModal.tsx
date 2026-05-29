import { useOpenMeetingRoles } from "../../hooks/useRoles";
import { useMeetingRoleSignups, useSignupForRole, useWithdrawFromRole } from "../../hooks/useRoleSignups";
import { useProfile } from "../../hooks/useProfile";

const MULTI_SLOT_ROLES = new Set(["Speaker", "Evaluator"]);

interface Props {
  meetingId: string;
  meetingLabel: string;
  onClose: () => void;
}

export default function RoleSignupModal({ meetingId, meetingLabel, onClose }: Props) {
  const { memberId } = useProfile();
  const { data: meetingRoles = [], isLoading } = useOpenMeetingRoles(meetingId);
  const { data: signups = [] } = useMeetingRoleSignups(meetingId);
  const signupMutation = useSignupForRole();
  const withdrawMutation = useWithdrawFromRole();

  const handleSignup = async (roleId: string) => {
    try {
      await signupMutation.mutateAsync({ meetingId, roleId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to sign up.");
    }
  };

  const handleWithdraw = async (roleId: string) => {
    try {
      await withdrawMutation.mutateAsync({ meetingId, roleId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to withdraw.");
    }
  };

  // Group signups by role_id
  const signupsByRole = new Map<string, typeof signups>();
  for (const s of signups) {
    const list = signupsByRole.get(s.role_id) ?? [];
    list.push(s);
    signupsByRole.set(s.role_id, list);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-12"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-[1.75rem] bg-app-panel shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-app-border px-6 py-5">
          <div>
            <p className="app-eyebrow">Role Sign-Up</p>
            <h2 className="mt-1 text-xl font-semibold text-app-text">{meetingLabel}</h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg p-1 text-app-text-muted hover:text-app-text"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-app-text-muted">Loading roles…</p>
          ) : meetingRoles.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-text-muted">
              No roles have been opened for signup yet.
            </p>
          ) : (
            meetingRoles.map((mr) => {
              const roleName = mr.roles?.name ?? "Unknown";
              const isMulti = MULTI_SLOT_ROLES.has(roleName);
              const roleSignups = signupsByRole.get(mr.role_id) ?? [];
              const mySignup = roleSignups.find((s) => s.member_id === memberId);
              const adminAssigned = !!mr.member_id;
              const isTakenBySomeoneElse = !isMulti && roleSignups.length > 0 && !mySignup;

              return (
                <div
                  key={mr.id}
                  className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-app-border bg-app-panel-soft p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-app-text">{roleName}</p>
                      {isMulti && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600">
                          Multiple
                        </span>
                      )}
                    </div>

                    <div className="mt-1">
                      {adminAssigned ? (
                        <p className="text-sm text-app-text-muted">
                          Assigned: <span className="font-medium">{mr.members?.name ?? "—"}</span>
                        </p>
                      ) : !mr.signup_open ? (
                        <p className="text-sm text-app-text-muted">Closed for signup</p>
                      ) : roleSignups.length === 0 ? (
                        <p className="text-sm text-app-text-muted">Open — no one signed up yet</p>
                      ) : (
                        <p className="text-sm text-app-text-muted">
                          {isMulti ? (
                            roleSignups.map((s) => s.members?.name ?? "—").join(", ")
                          ) : (
                            <>Taken by <span className="font-medium">{roleSignups[0].members?.name ?? "—"}</span></>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {adminAssigned ? (
                      <span className="inline-block rounded-xl bg-app-panel px-3 py-1.5 text-xs font-semibold text-app-text-muted">
                        Assigned
                      </span>
                    ) : !mr.signup_open ? (
                      <span className="inline-block rounded-xl bg-app-panel px-3 py-1.5 text-xs font-semibold text-app-text-muted">
                        Closed
                      </span>
                    ) : mySignup ? (
                      <button
                        onClick={() => handleWithdraw(mr.role_id)}
                        disabled={withdrawMutation.isPending}
                        className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    ) : isTakenBySomeoneElse ? (
                      <span className="inline-block rounded-xl bg-app-panel px-3 py-1.5 text-xs font-semibold text-app-text-muted">
                        Taken
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSignup(mr.role_id)}
                        disabled={signupMutation.isPending}
                        className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                      >
                        Sign Up
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="border-t border-app-border px-6 py-4 text-center text-xs text-app-text-subtle">
          Role availability refreshes every 10 seconds.
        </p>
      </div>
    </div>
  );
}
