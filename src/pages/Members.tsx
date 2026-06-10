import { useState } from "react";
import { Link } from "react-router-dom";
import { useMembers, useDeleteMember, useSetMemberRole } from "../hooks/useMembers";
import type { MemberWithRole } from "../types/database";
import MemberForm from "../components/members/MemberForm";
import { AppShell } from "../components/ui/AppShell";
import { useProfile } from "../hooks/useProfile";

type ClubRole = 'super_admin' | 'admin' | 'member' | 'guest';

function MemberStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-600"
          : "bg-app-panel-soft text-app-text-muted"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const ROLE_STYLES: Record<ClubRole, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin:       "bg-blue-100 text-blue-700",
  member:      "bg-slate-100 text-slate-600",
  guest:       "bg-amber-50 text-amber-600",
};

const ROLE_LABELS: Record<ClubRole, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  member:      "Member",
  guest:       "Guest",
};

function RoleBadge({ role }: { role: ClubRole }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_STYLES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

interface RoleSelectProps {
  member: MemberWithRole;
  onClose: () => void;
}

function RoleSelectPopover({ member, onClose }: RoleSelectProps) {
  const setRole = useSetMemberRole();
  const [pending, setPending] = useState(false);

  const handleSelect = async (role: ClubRole) => {
    if (role === member.club_role) { onClose(); return; }
    setPending(true);
    try {
      await setRole.mutateAsync({ memberId: member.id, role });
      onClose();
    } finally {
      setPending(false);
    }
  };

  const options: ClubRole[] = ["admin", "member", "guest"];

  return (
    <div className="absolute right-0 top-8 z-10 w-40 rounded-2xl border border-app-border bg-app-panel py-2 shadow-app-card">
      {options.map((role) => (
        <button
          key={role}
          disabled={pending}
          onClick={() => handleSelect(role)}
          className={`w-full px-4 py-2 text-left text-sm transition hover:bg-app-panel-soft disabled:opacity-50 ${
            member.club_role === role ? "font-semibold text-primary" : "text-app-text"
          }`}
        >
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  );
}

export default function Members() {
  const { data: members, isLoading, error } = useMembers();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithRole | null>(null);
  const [deletingMember, setDeletingMember] = useState<MemberWithRole | null>(null);
  const [rolePopoverFor, setRolePopoverFor] = useState<string | null>(null);
  const { isAdmin, isSuperAdmin } = useProfile();
  const deleteMember = useDeleteMember();

  const activeCount = members?.filter((m) => m.active).length ?? 0;
  const inactiveCount = (members?.length ?? 0) - activeCount;

  const canEdit = (member: MemberWithRole) => {
    if (isSuperAdmin) return true;
    if (isAdmin && (member.club_role === "admin" || member.club_role === "super_admin")) return false;
    return isAdmin;
  };

  const canDelete = (member: MemberWithRole) => {
    if (isSuperAdmin) return true;
    if (isAdmin && (member.club_role === "admin" || member.club_role === "super_admin")) return false;
    return isAdmin;
  };

  const handleEdit = (member: MemberWithRole) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMember) return;
    await deleteMember.mutateAsync(deletingMember.id);
    setDeletingMember(null);
  };

  return (
    <AppShell>
      <section className="space-y-6 pt-8 pb-6 md:space-y-8 md:pt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-app-text md:text-[3rem]">
              Members
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="rounded-[1.35rem] border border-app-border bg-app-panel px-4 py-3 text-sm text-app-text-muted shadow-app-card">
              <span className="font-semibold text-app-text">
                {members?.length ?? 0}
              </span>{" "}
              total members
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,130,246,0.24)] transition hover:bg-primary/90"
              >
                Add Member
              </button>
            )}
          </div>
        </div>

        {isFormOpen && (
          <MemberForm member={editingMember} onClose={handleCloseForm} />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Total Members
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">
              {members?.length ?? 0}
            </div>
          </div>
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Active
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">
              {activeCount}
            </div>
          </div>
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Inactive
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">
              {inactiveCount}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            Loading members...
          </div>
        ) : error ? (
          <div className="rounded-[1.5rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
            Error loading members: {error.message}
          </div>
        ) : members?.length ? (
          <>
            {/* Mobile cards */}
            <div className="space-y-4 md:hidden">
              {members.map((member) => (
                <article key={member.id} className="app-panel rounded-[1.5rem] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/profile/${member.id}`}
                        className="block text-xl font-semibold text-app-text transition hover:text-primary"
                      >
                        {member.name}
                      </Link>
                      <p className="mt-1 truncate text-sm text-app-text-muted">
                        {member.email || "No email added"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <MemberStatusBadge active={member.active} />
                      <RoleBadge role={member.club_role as ClubRole} />
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      to={`/profile/${member.id}`}
                      className="flex-1 rounded-xl border border-app-border bg-app-panel-soft px-4 py-3 text-center text-sm font-medium text-app-text"
                    >
                      View
                    </Link>
                    {canEdit(member) && (
                      <button
                        onClick={() => handleEdit(member)}
                        className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete(member) && (
                      <button
                        onClick={() => setDeletingMember(member)}
                        className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {isSuperAdmin && member.club_role !== "super_admin" && (
                    <div className="relative mt-3">
                      <button
                        onClick={() =>
                          setRolePopoverFor(rolePopoverFor === member.id ? null : member.id)
                        }
                        className="w-full rounded-xl border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition hover:bg-app-panel-soft"
                      >
                        Change Role
                      </button>
                      {rolePopoverFor === member.id && (
                        <RoleSelectPopover
                          member={member}
                          onClose={() => setRolePopoverFor(null)}
                        />
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-[1.75rem] border border-app-border bg-app-panel shadow-app-card md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-app-border">
                  <thead className="bg-app-panel-soft/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="transition hover:bg-app-panel-soft/40"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <Link
                            to={`/profile/${member.id}`}
                            className="font-medium text-primary hover:text-primary/80"
                          >
                            {member.name}
                          </Link>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-app-text-muted">
                          {member.email || "-"}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <RoleBadge role={member.club_role as ClubRole} />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <MemberStatusBadge active={member.active} />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-4">
                            {canEdit(member) && (
                              <button
                                onClick={() => handleEdit(member)}
                                className="text-sm font-medium text-primary hover:text-primary/80"
                              >
                                Edit
                              </button>
                            )}
                            {canDelete(member) && (
                              <button
                                onClick={() => setDeletingMember(member)}
                                className="text-sm font-medium text-red-500 hover:text-red-700"
                              >
                                Delete
                              </button>
                            )}
                            {isSuperAdmin && member.club_role !== "super_admin" && (
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setRolePopoverFor(
                                      rolePopoverFor === member.id ? null : member.id,
                                    )
                                  }
                                  className="text-sm font-medium text-app-text-muted hover:text-app-text"
                                >
                                  Role ▾
                                </button>
                                {rolePopoverFor === member.id && (
                                  <RoleSelectPopover
                                    member={member}
                                    onClose={() => setRolePopoverFor(null)}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="app-panel rounded-[1.5rem] px-5 py-12 text-center text-app-text-muted">
            No members found. Add your first member to get started.
          </div>
        )}
      </section>

      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[1.75rem] bg-app-panel p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-app-text">Delete member?</h2>
            <p className="mt-2 text-sm text-app-text-muted">
              <span className="font-medium text-app-text">{deletingMember.name}</span> will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeletingMember(null)}
                className="flex-1 rounded-xl border border-app-border bg-app-panel-soft px-4 py-3 text-sm font-medium text-app-text"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMember.isPending}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMember.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
