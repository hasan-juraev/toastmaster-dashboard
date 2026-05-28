-- =============================================================
-- RBAC Phase 4: RLS Policies
-- IMPORTANT: Run LAST — after all frontend changes are deployed.
-- This file tightens RLS so only authenticated users with
-- appropriate roles can read/write each table.
-- =============================================================

-- Drop existing permissive policies before replacing them
-- (policies from 20260522_rls_all_tables.sql and 20260518_meeting_roles_rls.sql)
do $$ begin
  -- members
  drop policy if exists "Allow authenticated read" on members;
  drop policy if exists "Allow authenticated insert" on members;
  drop policy if exists "Allow authenticated update" on members;
  drop policy if exists "Allow authenticated delete" on members;
  -- meetings
  drop policy if exists "Allow authenticated read" on meetings;
  drop policy if exists "Allow authenticated insert" on meetings;
  drop policy if exists "Allow authenticated update" on meetings;
  drop policy if exists "Allow authenticated delete" on meetings;
  -- meeting_roles
  drop policy if exists "Allow authenticated read" on meeting_roles;
  drop policy if exists "Allow authenticated insert" on meeting_roles;
  drop policy if exists "Allow authenticated update" on meeting_roles;
  drop policy if exists "Allow authenticated delete" on meeting_roles;
  drop policy if exists "meeting_roles_select_policy" on meeting_roles;
  drop policy if exists "meeting_roles_insert_policy" on meeting_roles;
  drop policy if exists "meeting_roles_update_policy" on meeting_roles;
  drop policy if exists "meeting_roles_delete_policy" on meeting_roles;
  -- speeches
  drop policy if exists "Allow authenticated read" on speeches;
  drop policy if exists "Allow authenticated insert" on speeches;
  drop policy if exists "Allow authenticated update" on speeches;
  drop policy if exists "Allow authenticated delete" on speeches;
  -- grammarian_reports
  drop policy if exists "Allow authenticated read" on grammarian_reports;
  drop policy if exists "Allow authenticated insert" on grammarian_reports;
  drop policy if exists "Allow authenticated update" on grammarian_reports;
  drop policy if exists "Allow authenticated delete" on grammarian_reports;
  -- ah_counter_reports
  drop policy if exists "Allow authenticated read" on ah_counter_reports;
  drop policy if exists "Allow authenticated insert" on ah_counter_reports;
  drop policy if exists "Allow authenticated update" on ah_counter_reports;
  drop policy if exists "Allow authenticated delete" on ah_counter_reports;
  -- evaluator_reports
  drop policy if exists "Allow authenticated read" on evaluator_reports;
  drop policy if exists "Allow authenticated insert" on evaluator_reports;
  drop policy if exists "Allow authenticated update" on evaluator_reports;
  drop policy if exists "Allow authenticated delete" on evaluator_reports;
  -- timer_reports
  drop policy if exists "Allow authenticated read" on timer_reports;
  drop policy if exists "Allow authenticated insert" on timer_reports;
  drop policy if exists "Allow authenticated update" on timer_reports;
  drop policy if exists "Allow authenticated delete" on timer_reports;
  -- votes
  drop policy if exists "Allow authenticated read" on votes;
  drop policy if exists "Allow authenticated insert" on votes;
  drop policy if exists "Allow authenticated update" on votes;
  drop policy if exists "Allow authenticated delete" on votes;
  -- speech_comments
  drop policy if exists "Allow authenticated read" on speech_comments;
  drop policy if exists "Allow authenticated insert" on speech_comments;
  drop policy if exists "Allow authenticated update" on speech_comments;
  drop policy if exists "Allow authenticated delete" on speech_comments;
end $$;

-- =============================================================
-- Enable RLS on all tables
-- =============================================================

alter table profiles           enable row level security;
alter table members            enable row level security;
alter table meetings           enable row level security;
alter table meeting_roles      enable row level security;
alter table speeches           enable row level security;
alter table grammarian_reports enable row level security;
alter table ah_counter_reports enable row level security;
alter table evaluator_reports  enable row level security;
alter table timer_reports      enable row level security;
alter table votes              enable row level security;
alter table speech_comments    enable row level security;

-- =============================================================
-- profiles
-- =============================================================

create policy "profiles: own row read"
  on profiles for select using (id = auth.uid());

create policy "profiles: admin read all"
  on profiles for select using (get_my_club_role() = 'admin');

create policy "profiles: own row update"
  on profiles for update using (id = auth.uid());

-- =============================================================
-- members
-- =============================================================

create policy "members: authenticated read"
  on members for select using (auth.role() = 'authenticated');

create policy "members: admin insert"
  on members for insert with check (get_my_club_role() = 'admin');

create policy "members: admin update"
  on members for update using (get_my_club_role() = 'admin');

create policy "members: admin delete"
  on members for delete using (get_my_club_role() = 'admin');

-- =============================================================
-- meetings
-- =============================================================

create policy "meetings: authenticated read"
  on meetings for select using (auth.role() = 'authenticated');

create policy "meetings: admin insert"
  on meetings for insert with check (get_my_club_role() = 'admin');

create policy "meetings: admin update"
  on meetings for update using (get_my_club_role() = 'admin');

create policy "meetings: toastmaster update theme"
  on meetings for update
  using (i_hold_meeting_role(id, 'Toastmaster'))
  with check (i_hold_meeting_role(id, 'Toastmaster'));

-- =============================================================
-- meeting_roles
-- =============================================================

create policy "meeting_roles: admin full access"
  on meeting_roles for all using (get_my_club_role() = 'admin');

create policy "meeting_roles: member read open or own"
  on meeting_roles for select
  using (signup_open = true or member_id = get_my_member_id());

-- =============================================================
-- speeches
-- =============================================================

create policy "speeches: authenticated read"
  on speeches for select using (auth.role() = 'authenticated');

create policy "speeches: admin full access"
  on speeches for all using (get_my_club_role() = 'admin');

create policy "speeches: speaker insert own"
  on speeches for insert
  with check (
    i_hold_meeting_role(meeting_id, 'Speaker')
    and speaker_id = get_my_member_id()
  );

create policy "speeches: speaker update own"
  on speeches for update
  using (speaker_id = get_my_member_id())
  with check (speaker_id = get_my_member_id());

-- =============================================================
-- grammarian_reports
-- =============================================================

create policy "grammarian_reports: authenticated read"
  on grammarian_reports for select using (auth.role() = 'authenticated');

create policy "grammarian_reports: admin full access"
  on grammarian_reports for all using (get_my_club_role() = 'admin');

create policy "grammarian_reports: grammarian insert own"
  on grammarian_reports for insert
  with check (
    member_id = get_my_member_id()
    and i_hold_meeting_role(meeting_id, 'Grammarian')
  );

create policy "grammarian_reports: grammarian update own"
  on grammarian_reports for update
  using (member_id = get_my_member_id());

-- =============================================================
-- ah_counter_reports
-- =============================================================

create policy "ah_counter_reports: authenticated read"
  on ah_counter_reports for select using (auth.role() = 'authenticated');

create policy "ah_counter_reports: admin full access"
  on ah_counter_reports for all using (get_my_club_role() = 'admin');

create policy "ah_counter_reports: ah_counter insert own"
  on ah_counter_reports for insert
  with check (
    i_hold_meeting_role(meeting_id, 'Ah-Counter')
    and exists (
      select 1 from meeting_roles
      where id = meeting_role_id and member_id = get_my_member_id()
    )
  );

create policy "ah_counter_reports: ah_counter update own"
  on ah_counter_reports for update
  using (
    exists (
      select 1 from meeting_roles
      where id = meeting_role_id and member_id = get_my_member_id()
    )
  );

-- =============================================================
-- evaluator_reports
-- =============================================================

create policy "evaluator_reports: authenticated read"
  on evaluator_reports for select using (auth.role() = 'authenticated');

create policy "evaluator_reports: admin full access"
  on evaluator_reports for all using (get_my_club_role() = 'admin');

create policy "evaluator_reports: evaluator insert own"
  on evaluator_reports for insert
  with check (
    member_id = get_my_member_id()
    and exists (
      select 1 from meeting_roles
      where id = meeting_role_id and member_id = get_my_member_id()
    )
  );

create policy "evaluator_reports: evaluator update own"
  on evaluator_reports for update
  using (member_id = get_my_member_id());

-- =============================================================
-- timer_reports
-- =============================================================

create policy "timer_reports: authenticated read"
  on timer_reports for select using (auth.role() = 'authenticated');

create policy "timer_reports: admin full access"
  on timer_reports for all using (get_my_club_role() = 'admin');

create policy "timer_reports: timer insert own"
  on timer_reports for insert
  with check (
    member_id = get_my_member_id()
    and i_hold_meeting_role(meeting_id, 'Timer')
  );

create policy "timer_reports: timer update own"
  on timer_reports for update
  using (member_id = get_my_member_id());

-- =============================================================
-- votes
-- =============================================================

create policy "votes: authenticated read"
  on votes for select using (auth.role() = 'authenticated');

create policy "votes: member vote as self"
  on votes for insert with check (voter_id = get_my_member_id());

create policy "votes: member update own vote"
  on votes for update using (voter_id = get_my_member_id());

create policy "votes: admin full access"
  on votes for all using (get_my_club_role() = 'admin');

-- =============================================================
-- speech_comments
-- =============================================================

create policy "speech_comments: authenticated read"
  on speech_comments for select using (auth.role() = 'authenticated');

create policy "speech_comments: member insert as self"
  on speech_comments for insert
  with check (commenter_id = get_my_member_id());

create policy "speech_comments: own comment delete"
  on speech_comments for delete
  using (commenter_id = get_my_member_id());

create policy "speech_comments: admin full access"
  on speech_comments for all using (get_my_club_role() = 'admin');
