alter table meeting_roles
  add column if not exists status text default 'unassigned',
  add column if not exists completed_at timestamptz,
  add column if not exists notes text,
  add column if not exists score numeric(4,1);

update meeting_roles
set status = case
  when member_id is null then 'unassigned'
  else 'assigned'
end
where status is null;

alter table grammarian_reports
  add column if not exists meeting_role_id uuid references meeting_roles on delete cascade,
  add column if not exists member_id uuid references members,
  add column if not exists notable_phrases int default 0,
  add column if not exists score numeric(4,1),
  add column if not exists created_at timestamptz default now();

update grammarian_reports
set member_id = speaker_id
where member_id is null
  and speaker_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grammarian_reports_meeting_role_id_key'
  ) then
    alter table grammarian_reports
      add constraint grammarian_reports_meeting_role_id_key unique (meeting_role_id);
  end if;
end $$;

create table if not exists evaluator_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_role_id uuid unique references meeting_roles on delete cascade,
  meeting_id uuid references meetings on delete cascade,
  member_id uuid references members,
  speech_id uuid references speeches on delete set null,
  quality_score numeric(4,1),
  strengths text,
  improvement_notes text,
  created_at timestamptz default now()
);

create table if not exists timer_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_role_id uuid unique references meeting_roles on delete cascade,
  meeting_id uuid references meetings on delete cascade,
  member_id uuid references members,
  target_seconds int,
  actual_seconds int,
  notes text,
  created_at timestamptz default now()
);
