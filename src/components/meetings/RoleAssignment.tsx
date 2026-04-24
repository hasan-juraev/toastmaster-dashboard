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
      <div className="p-4 text-center text-gray-500">
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
      <h2 className="text-xl font-semibold text-gray-900">Role Assignments</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles?.map((role) => {
              const assignment = meetingRoles?.find(
                (mr) => mr.role_id === role.id,
              );
              return (
                <tr key={role.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {role.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
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
