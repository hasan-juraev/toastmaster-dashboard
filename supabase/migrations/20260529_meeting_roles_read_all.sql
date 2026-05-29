-- Allow all authenticated users to read all meeting_roles rows.
-- The previous policy only exposed open slots or the user's own assignment,
-- which caused the dashboard agenda to show "Open" for all assigned roles.

drop policy if exists "meeting_roles: member read open or own" on meeting_roles;

create policy "meeting_roles: authenticated read all"
  on meeting_roles for select
  using (auth.role() = 'authenticated');
