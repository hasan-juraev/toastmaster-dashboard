-- MEMBERS
create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  active boolean default true,
  created_at timestamptz default now()
);

-- MEETINGS
create table meetings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  theme text,
  location text,
  status text default 'upcoming',
  created_at timestamptz default now()
);

-- ROLES
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- ASSIGNMENTS
create table meeting_roles (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings on delete cascade,
  role_id uuid references roles,
  member_id uuid references members,
  allow_duplicate boolean default false,
  status text default 'unassigned',
  completed_at timestamptz,
  notes text,
  score numeric(4,1),
  constraint meeting_roles_status_check
    check (status in ('unassigned', 'assigned', 'in_progress', 'completed', 'skipped')),
  constraint meeting_roles_score_range_check
    check (score is null or (score >= 0 and score <= 10)),
  unique (meeting_id, role_id) deferrable initially deferred
);

create index meeting_roles_meeting_id_idx on meeting_roles (meeting_id);
create index meeting_roles_member_id_idx on meeting_roles (member_id);
create index meeting_roles_role_id_idx on meeting_roles (role_id);

-- SPEECHES
create table speeches (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings on delete cascade,
  speaker_id uuid references members,
  title text,
  manual_time text,
  evaluator_id uuid references members,
  completed boolean default false,
  created_at timestamptz default now()
);

create index speeches_meeting_id_idx on speeches (meeting_id);
create index speeches_speaker_id_idx on speeches (speaker_id);
create index speeches_evaluator_id_idx on speeches (evaluator_id);
create index speeches_created_at_idx on speeches (created_at);

-- GRAMMARIAN
create table grammarian_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_role_id uuid unique references meeting_roles on delete cascade,
  meeting_id uuid references meetings on delete cascade,
  member_id uuid references members,
  grammar_errors int default 0,
  notable_phrases int default 0,
  score numeric(4,1),
  notes text,
  created_at timestamptz default now(),
  constraint grammarian_reports_nonnegative_check
    check (grammar_errors >= 0 and notable_phrases >= 0),
  constraint grammarian_reports_score_range_check
    check (score is null or (score >= 0 and score <= 10))
);

create index grammarian_reports_meeting_role_id_idx on grammarian_reports (meeting_role_id);
create index grammarian_reports_meeting_id_idx on grammarian_reports (meeting_id);
create index grammarian_reports_member_id_idx on grammarian_reports (member_id);

-- AH COUNTER
create table ah_counter_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid,
  speaker_id uuid,
  ah_count int default 0,
  notes text
);

-- EVALUATOR
create table evaluator_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_role_id uuid unique references meeting_roles on delete cascade,
  meeting_id uuid references meetings on delete cascade,
  member_id uuid references members,
  speech_id uuid references speeches on delete set null,
  quality_score numeric(4,1),
  strengths text,
  improvement_notes text,
  created_at timestamptz default now(),
  constraint evaluator_reports_quality_score_range_check
    check (quality_score is null or (quality_score >= 0 and quality_score <= 10))
);

create index evaluator_reports_meeting_role_id_idx on evaluator_reports (meeting_role_id);
create index evaluator_reports_meeting_id_idx on evaluator_reports (meeting_id);
create index evaluator_reports_member_id_idx on evaluator_reports (member_id);
create index evaluator_reports_speech_id_idx on evaluator_reports (speech_id);

-- TIMER
create table timer_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_role_id uuid unique references meeting_roles on delete cascade,
  meeting_id uuid references meetings on delete cascade,
  member_id uuid references members,
  target_seconds int,
  actual_seconds int,
  notes text,
  created_at timestamptz default now(),
  constraint timer_reports_seconds_nonnegative_check
    check (
      (target_seconds is null or target_seconds >= 0)
      and (actual_seconds is null or actual_seconds >= 0)
    )
);

create index timer_reports_meeting_role_id_idx on timer_reports (meeting_role_id);
create index timer_reports_meeting_id_idx on timer_reports (meeting_id);
create index timer_reports_member_id_idx on timer_reports (member_id);

-- VOTES
create table votes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid,
  category text,
  voted_for_member_id uuid
);

-- SEED ROLES
insert into roles (name) values
('Toastmaster'),
('Speaker'),
('Evaluator'),
('Grammarian'),
('Ah-Counter'),
('Timer'),
('General Evaluator');
