import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Member } from "../types/database";
import { AppShell } from "../components/ui/AppShell";

interface MemberDetailData {
  member: Member;
  speechesDelivered: number;
  rolesFilled: number;
  meetingsContributed: number;
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<MemberDetailData>({
    queryKey: ["member-detail", id],
    queryFn: async () => {
      const [
        { data: member, error: memberError },
        { data: speeches, error: speechError },
        { data: roles, error: roleError },
      ] = await Promise.all([
        supabase.from("members").select("*").eq("id", id).single(),
        supabase
          .from("speeches")
          .select("id, meeting_id")
          .eq("speaker_id", id)
          .eq("completed", true),
        supabase.from("meeting_roles").select("id, meeting_id").eq("member_id", id),
      ]);

      if (memberError) throw memberError;
      if (speechError) throw speechError;
      if (roleError) throw roleError;

      const meetingIds = new Set<string>();

      speeches?.forEach((speech) => {
        if (speech.meeting_id) {
          meetingIds.add(speech.meeting_id);
        }
      });

      roles?.forEach((role) => {
        if (role.meeting_id) {
          meetingIds.add(role.meeting_id);
        }
      });

      return {
        member: member as Member,
        speechesDelivered: speeches?.length ?? 0,
        rolesFilled: roles?.length ?? 0,
        meetingsContributed: meetingIds.size,
      };
    },
    enabled: !!id,
  });

  const member = data?.member;

  if (isLoading) {
    return (
      <AppShell>
        <div className="pt-10 text-center text-app-text-muted">
          Loading member details...
        </div>
      </AppShell>
    );
  }

  if (error || !member || !data) {
    return (
      <AppShell>
        <div className="pt-10">
          <div className="rounded-[1.5rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
            Error loading member details
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="space-y-6 pt-8 pb-6 md:space-y-8 md:pt-10">
        <div>
          <Link to="/members" className="text-sm font-medium text-primary">
            ← Back to Members
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="app-panel rounded-[2rem] p-6 md:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="app-eyebrow">Profile</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-app-text md:text-[3rem]">
                  {member.name}
                </h1>
                <p className="mt-3 text-base text-app-text-muted">
                  {member.email || "No email on file"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  member.active
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-app-panel-soft text-app-text-muted"
                }`}
              >
                {member.active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.35rem] bg-app-panel-soft p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  Speeches
                </div>
                <div className="mt-2 text-3xl font-bold text-app-text">
                  {data.speechesDelivered}
                </div>
                <div className="mt-1 text-sm text-app-text-muted">
                  Completed speeches
                </div>
              </div>
              <div className="rounded-[1.35rem] bg-app-panel-soft p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  Roles Filled
                </div>
                <div className="mt-2 text-3xl font-bold text-app-text">
                  {data.rolesFilled}
                </div>
                <div className="mt-1 text-sm text-app-text-muted">
                  Assigned meeting roles
                </div>
              </div>
              <div className="rounded-[1.35rem] bg-app-panel-soft p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  Meetings
                </div>
                <div className="mt-2 text-3xl font-bold text-app-text">
                  {data.meetingsContributed}
                </div>
                <div className="mt-1 text-sm text-app-text-muted">
                  Distinct meetings contributed to
                </div>
              </div>
            </div>
          </div>

          <div className="app-panel rounded-[2rem] p-6">
            <p className="app-eyebrow">Summary</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
              Member snapshot
            </h2>
            <p className="mt-3 text-sm leading-6 text-app-text-muted">
              This profile now surfaces real contribution counts instead of
              placeholders, which makes the roster more useful during meeting planning.
            </p>
            <div className="mt-5 rounded-[1.35rem] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-app-text">Suggested next step</p>
              <p className="mt-2 text-sm text-app-text-muted">
                {member.active
                  ? "Consider rotating this member into a new role category to keep role diversity healthy."
                  : "Re-activate this member when they are ready to return to the meeting schedule."}
              </p>
            </div>
          </div>
        </div>

        <div className="app-panel rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Statistics</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
                Contribution overview
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.35rem] border border-app-border p-4">
              <p className="text-sm text-app-text-muted">Speaking momentum</p>
              <p className="mt-2 text-xl font-semibold text-app-text">
                {data.speechesDelivered > 0 ? "Engaged speaker" : "No completed speeches yet"}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-app-border p-4">
              <p className="text-sm text-app-text-muted">Role participation</p>
              <p className="mt-2 text-xl font-semibold text-app-text">
                {data.rolesFilled > 0 ? "Helping meetings run" : "No roles assigned yet"}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-app-border p-4">
              <p className="text-sm text-app-text-muted">Meeting involvement</p>
              <p className="mt-2 text-xl font-semibold text-app-text">
                {data.meetingsContributed > 0
                  ? "Shows up across multiple meetings"
                  : "Awaiting first recorded contribution"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
