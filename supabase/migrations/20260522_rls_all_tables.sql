-- Phase 9: Enable RLS on all public tables and add permissive policies for
-- authenticated users. This app uses a single authenticated role (club admin /
-- member) so all policies simply check `to authenticated` with no row filter.
-- meeting_roles already has RLS from 20260518_meeting_roles_rls.sql.

-- ─── members ──────────────────────────────────────────────────────────────────
alter table members enable row level security;

create policy members_select_authenticated
  on members for select to authenticated using (true);

create policy members_insert_authenticated
  on members for insert to authenticated with check (true);

create policy members_update_authenticated
  on members for update to authenticated using (true) with check (true);

create policy members_delete_authenticated
  on members for delete to authenticated using (true);

-- ─── roles ────────────────────────────────────────────────────────────────────
alter table roles enable row level security;

create policy roles_select_authenticated
  on roles for select to authenticated using (true);

create policy roles_insert_authenticated
  on roles for insert to authenticated with check (true);

create policy roles_update_authenticated
  on roles for update to authenticated using (true) with check (true);

create policy roles_delete_authenticated
  on roles for delete to authenticated using (true);

-- ─── meetings ─────────────────────────────────────────────────────────────────
alter table meetings enable row level security;

create policy meetings_select_authenticated
  on meetings for select to authenticated using (true);

create policy meetings_insert_authenticated
  on meetings for insert to authenticated with check (true);

create policy meetings_update_authenticated
  on meetings for update to authenticated using (true) with check (true);

create policy meetings_delete_authenticated
  on meetings for delete to authenticated using (true);

-- ─── speeches ─────────────────────────────────────────────────────────────────
alter table speeches enable row level security;

create policy speeches_select_authenticated
  on speeches for select to authenticated using (true);

create policy speeches_insert_authenticated
  on speeches for insert to authenticated with check (true);

create policy speeches_update_authenticated
  on speeches for update to authenticated using (true) with check (true);

create policy speeches_delete_authenticated
  on speeches for delete to authenticated using (true);

-- ─── speech_comments ──────────────────────────────────────────────────────────
alter table speech_comments enable row level security;

create policy speech_comments_select_authenticated
  on speech_comments for select to authenticated using (true);

create policy speech_comments_insert_authenticated
  on speech_comments for insert to authenticated with check (true);

create policy speech_comments_update_authenticated
  on speech_comments for update to authenticated using (true) with check (true);

create policy speech_comments_delete_authenticated
  on speech_comments for delete to authenticated using (true);

-- ─── grammarian_reports ───────────────────────────────────────────────────────
alter table grammarian_reports enable row level security;

create policy grammarian_reports_select_authenticated
  on grammarian_reports for select to authenticated using (true);

create policy grammarian_reports_insert_authenticated
  on grammarian_reports for insert to authenticated with check (true);

create policy grammarian_reports_update_authenticated
  on grammarian_reports for update to authenticated using (true) with check (true);

create policy grammarian_reports_delete_authenticated
  on grammarian_reports for delete to authenticated using (true);

-- ─── ah_counter_reports ───────────────────────────────────────────────────────
alter table ah_counter_reports enable row level security;

create policy ah_counter_reports_select_authenticated
  on ah_counter_reports for select to authenticated using (true);

create policy ah_counter_reports_insert_authenticated
  on ah_counter_reports for insert to authenticated with check (true);

create policy ah_counter_reports_update_authenticated
  on ah_counter_reports for update to authenticated using (true) with check (true);

create policy ah_counter_reports_delete_authenticated
  on ah_counter_reports for delete to authenticated using (true);

-- ─── evaluator_reports ────────────────────────────────────────────────────────
alter table evaluator_reports enable row level security;

create policy evaluator_reports_select_authenticated
  on evaluator_reports for select to authenticated using (true);

create policy evaluator_reports_insert_authenticated
  on evaluator_reports for insert to authenticated with check (true);

create policy evaluator_reports_update_authenticated
  on evaluator_reports for update to authenticated using (true) with check (true);

create policy evaluator_reports_delete_authenticated
  on evaluator_reports for delete to authenticated using (true);

-- ─── timer_reports ────────────────────────────────────────────────────────────
alter table timer_reports enable row level security;

create policy timer_reports_select_authenticated
  on timer_reports for select to authenticated using (true);

create policy timer_reports_insert_authenticated
  on timer_reports for insert to authenticated with check (true);

create policy timer_reports_update_authenticated
  on timer_reports for update to authenticated using (true) with check (true);

create policy timer_reports_delete_authenticated
  on timer_reports for delete to authenticated using (true);

-- ─── votes ────────────────────────────────────────────────────────────────────
alter table votes enable row level security;

create policy votes_select_authenticated
  on votes for select to authenticated using (true);

create policy votes_insert_authenticated
  on votes for insert to authenticated with check (true);

create policy votes_update_authenticated
  on votes for update to authenticated using (true) with check (true);

create policy votes_delete_authenticated
  on votes for delete to authenticated using (true);
