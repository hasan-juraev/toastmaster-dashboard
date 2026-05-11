import { useMembers } from "../../hooks/useMembers";
import {
  useRoles,
  useMeetingRoles,
  useUpsertMeetingRole,
  useDeleteMeetingRole,
} from "../../hooks/useRoles";
import { useState } from "react";

interface RoleAssignmentProps {
  meetingId: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to update this role assignment.";
}

export default function RoleAssignment({ meetingId }: RoleAssignmentProps) {
  const { data: roles, isLoading: loadingRoles } = useRoles();
  const { data: members, isLoading: loadingMembers } = useMembers();
  const { data: meetingRoles, isLoading: loadingMeetingRoles } =
    useMeetingRoles(meetingId);
  const upsertRole = useUpsertMeetingRole();
  const deleteRole = useDeleteMeetingRole();
  const [error, setError] = useState<string | null>(null);

  if (loadingRoles || loadingMembers || loadingMeetingRoles) {
    return (
      <div className="app-panel rounded-[1.5rem] p-6 text-center text-app-text-muted">
        Loading roles and members...
      </div>
    );
  }

  const handleMemberChange = async (
    roleId: string,
    memberId: string | null,
  ) => {
    setError(null);
    const existingAssignment = meetingRoles?.find(
      (mr) => mr.role_id === roleId,
    );

    try {
      if (!memberId && existingAssignment) {
        await deleteRole.mutateAsync({
          id: existingAssignment.id,
          meeting_id: meetingId,
        });
      } else if (memberId) {
        await upsertRole.mutateAsync({
          id: existingAssignment?.id,
          meeting_id: meetingId,
          role_id: roleId,
          member_id: memberId,
          allow_duplicate: false,
        });
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="app-eyebrow">Assignments</p>
        <h2 className="mt-2 text-xl font-semibold text-app-text">Role Assignments</h2>
      </div>

      {error && (
        <div className="rounded-[1.25rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {roles?.map((role) => {
          const assignment = meetingRoles?.find((mr) => mr.role_id === role.id);

          return (
            <article key={role.id} className="app-panel rounded-[1.4rem] p-4">
              <p className="text-base font-semibold text-app-text">{role.name}</p>
              <select
                className="mt-3 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                value={assignment?.member_id || ""}
                onChange={(e) =>
                  handleMemberChange(role.id, e.target.value || null)
                }
              >
                <option value="">- Unassigned -</option>
                {members
                  ?.filter((m) => m.active)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-[1.75rem] border border-app-border bg-app-panel shadow-app-card md:block">
        <table className="min-w-full divide-y divide-app-border">
          <thead className="bg-app-panel-soft/60">
            <tr>
              <th className="w-1/3 px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                Member
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {roles?.map((role) => {
              const assignment = meetingRoles?.find(
                (mr) => mr.role_id === role.id,
              );
              return (
                <tr key={role.id}>
                  <td className="px-6 py-4 text-sm font-medium text-app-text">
                    {role.name}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={assignment?.member_id || ""}
                      onChange={(e) =>
                        handleMemberChange(role.id, e.target.value || null)
                      }
                    >
                      <option value="">- Unassigned -</option>
                      {members
                        ?.filter((m) => m.active)
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
