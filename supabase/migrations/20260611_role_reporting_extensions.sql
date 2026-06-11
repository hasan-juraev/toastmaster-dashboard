-- Phase 1: Role reporting extensions
-- 1. Add word_of_the_day to grammarian_reports
-- 2. New grammarian_member_entries table for per-speaker breakdown
-- 3. New RPC for role takers to self-mark their role completed

-- 1. Word of the Day field
alter table grammarian_reports
  add column if not exists word_of_the_day text;

-- 2. Per-speaker grammar entry table
create table if not exists grammarian_member_entries (
  id                   uuid primary key default gen_random_uuid(),
  grammarian_report_id uuid not null references grammarian_reports(id) on delete cascade,
  subject_member_id    uuid references members(id) on delete set null,
  error_count          int not null default 0 check (error_count >= 0),
  notes                text,
  created_at           timestamptz default now(),
  unique (grammarian_report_id, subject_member_id)
);

create index if not exists grammarian_member_entries_report_idx
  on grammarian_member_entries(grammarian_report_id);
create index if not exists grammarian_member_entries_subject_idx
  on grammarian_member_entries(subject_member_id);

alter table grammarian_member_entries enable row level security;

create policy "grammarian_member_entries: authenticated read"
  on grammarian_member_entries for select to authenticated using (true);

create policy "grammarian_member_entries: admin full access"
  on grammarian_member_entries for all to authenticated
  using (get_my_club_role() in ('admin', 'super_admin'))
  with check (get_my_club_role() in ('admin', 'super_admin'));

create policy "grammarian_member_entries: grammarian insert own"
  on grammarian_member_entries for insert to authenticated
  with check (
    exists (
      select 1 from grammarian_reports gr
      where gr.id = grammarian_report_id
        and gr.member_id = get_my_member_id()
    )
  );

create policy "grammarian_member_entries: grammarian update own"
  on grammarian_member_entries for update to authenticated
  using (
    exists (
      select 1 from grammarian_reports gr
      where gr.id = grammarian_report_id
        and gr.member_id = get_my_member_id()
    )
  );

-- 3. RPC: role taker self-completes their own meeting role
create or replace function complete_my_meeting_role(p_meeting_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update meeting_roles
  set    status       = 'completed',
         completed_at = now()
  where  id        = p_meeting_role_id
    and  member_id = get_my_member_id();
end;
$$;
