import { useState } from "react";
import { Link } from "react-router-dom";
import { useMembers } from "../hooks/useMembers";
import type { Member } from "../types/database";
import MemberForm from "../components/members/MemberForm";
import { AppShell } from "../components/ui/AppShell";

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

export default function Members() {
  const { data: members, isLoading, error } = useMembers();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const activeCount = members?.filter((member) => member.active).length ?? 0;
  const inactiveCount = (members?.length ?? 0) - activeCount;

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
  };

  return (
    <AppShell>
      <section className="space-y-6 pt-8 pb-6 md:space-y-8 md:pt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-eyebrow">
              Active Roster
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-app-text md:text-[3rem]">
              Members
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-app-text-muted md:text-base">
              Browse the club roster, track active members, and jump into
              individual profiles from a cleaner responsive table layout.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="rounded-[1.35rem] border border-app-border bg-app-panel px-4 py-3 text-sm text-app-text-muted shadow-app-card">
              <span className="font-semibold text-app-text">{members?.length ?? 0}</span>{" "}
              total members
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,130,246,0.24)] transition hover:bg-primary/90"
            >
              Add Member
            </button>
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
            <div className="mt-3 text-3xl font-bold text-app-text">{activeCount}</div>
          </div>
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Inactive
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">{inactiveCount}</div>
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
            <div className="space-y-4 md:hidden">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="app-panel rounded-[1.5rem] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/members/${member.id}`}
                        className="block text-xl font-semibold text-app-text transition hover:text-primary"
                      >
                        {member.name}
                      </Link>
                      <p className="mt-1 truncate text-sm text-app-text-muted">
                        {member.email || "No email added"}
                      </p>
                    </div>
                    <MemberStatusBadge active={member.active} />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      to={`/members/${member.id}`}
                      className="flex-1 rounded-xl border border-app-border bg-app-panel-soft px-4 py-3 text-center text-sm font-medium text-app-text"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleEdit(member)}
                      className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                    >
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>

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
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {members.map((member) => (
                      <tr key={member.id} className="transition hover:bg-app-panel-soft/40">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <Link
                            to={`/members/${member.id}`}
                            className="font-medium text-primary hover:text-primary/80"
                          >
                            {member.name}
                          </Link>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-app-text-muted">
                          {member.email || "-"}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <MemberStatusBadge active={member.active} />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-sm font-medium text-primary hover:text-primary/80"
                          >
                            Edit
                          </button>
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
    </AppShell>
  );
}
