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

create index if not exists meeting_roles_meeting_id_idx on meeting_roles (meeting_id);
create index if not exists meeting_roles_member_id_idx on meeting_roles (member_id);
create index if not exists meeting_roles_role_id_idx on meeting_roles (role_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meeting_roles_status_check'
      and conrelid = 'meeting_roles'::regclass
  ) then
    alter table meeting_roles
      add constraint meeting_roles_status_check
      check (status in ('unassigned', 'assigned', 'in_progress', 'completed', 'skipped'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meeting_roles_score_range_check'
      and conrelid = 'meeting_roles'::regclass
  ) then
    alter table meeting_roles
      add constraint meeting_roles_score_range_check
      check (score is null or (score >= 0 and score <= 10));
  end if;
end $$;

alter table grammarian_reports
  add column if not exists meeting_role_id uuid references meeting_roles on delete cascade,
  add column if not exists member_id uuid references members,
  add column if not exists notable_phrases int default 0,
  add column if not exists score numeric(4,1),
  add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'grammarian_reports'
      and column_name = 'speaker_id'
  ) then
    execute $update$
      update grammarian_reports
      set member_id = speaker_id
      where member_id is null
        and speaker_id is not null
    $update$;
  end if;
end $$;

create index if not exists grammarian_reports_meeting_role_id_idx on grammarian_reports (meeting_role_id);
create index if not exists grammarian_reports_meeting_id_idx on grammarian_reports (meeting_id);
create index if not exists grammarian_reports_member_id_idx on grammarian_reports (member_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grammarian_reports_meeting_role_id_key'
      and conrelid = 'grammarian_reports'::regclass
  ) then
    alter table grammarian_reports
      add constraint grammarian_reports_meeting_role_id_key unique (meeting_role_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grammarian_reports_nonnegative_check'
      and conrelid = 'grammarian_reports'::regclass
  ) then
    alter table grammarian_reports
      add constraint grammarian_reports_nonnegative_check
      check (grammar_errors >= 0 and notable_phrases >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grammarian_reports_score_range_check'
      and conrelid = 'grammarian_reports'::regclass
  ) then
    alter table grammarian_reports
      add constraint grammarian_reports_score_range_check
      check (score is null or (score >= 0 and score <= 10));
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

create index if not exists evaluator_reports_meeting_role_id_idx on evaluator_reports (meeting_role_id);
create index if not exists evaluator_reports_meeting_id_idx on evaluator_reports (meeting_id);
create index if not exists evaluator_reports_member_id_idx on evaluator_reports (member_id);
create index if not exists evaluator_reports_speech_id_idx on evaluator_reports (speech_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluator_reports_quality_score_range_check'
      and conrelid = 'evaluator_reports'::regclass
  ) then
    alter table evaluator_reports
      add constraint evaluator_reports_quality_score_range_check
      check (quality_score is null or (quality_score >= 0 and quality_score <= 10));
  end if;
end $$;

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

create index if not exists timer_reports_meeting_role_id_idx on timer_reports (meeting_role_id);
create index if not exists timer_reports_meeting_id_idx on timer_reports (meeting_id);
create index if not exists timer_reports_member_id_idx on timer_reports (member_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'timer_reports_seconds_nonnegative_check'
      and conrelid = 'timer_reports'::regclass
  ) then
    alter table timer_reports
      add constraint timer_reports_seconds_nonnegative_check
      check (
        (target_seconds is null or target_seconds >= 0)
        and (actual_seconds is null or actual_seconds >= 0)
      );
  end if;
end $$;
