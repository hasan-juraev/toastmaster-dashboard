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
  created_at timestamptz default now(),
  constraint meetings_status_check
    check (status in ('upcoming', 'in_progress', 'completed', 'cancelled'))
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
  speaker_id uuid references members(id) on delete set null,
  title text,
  manual_time text,
  evaluator_id uuid references members(id) on delete set null,
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
  meeting_role_id uuid not null unique references meeting_roles on delete cascade,
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
  meeting_id uuid references meetings(id) on delete cascade,
  speaker_id uuid references members(id) on delete set null,
  ah_count int default 0,
  notes text,
  created_at timestamptz default now(),
  meeting_role_id uuid references meeting_roles(id) on delete set null,
  constraint ah_counter_one_per_speaker_per_meeting unique (meeting_id, speaker_id)
);

create index ah_counter_reports_meeting_id_idx on ah_counter_reports(meeting_id);
create index ah_counter_reports_speaker_id_idx on ah_counter_reports(speaker_id);

-- EVALUATOR
create table evaluator_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_role_id uuid not null unique references meeting_roles on delete cascade,
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
  meeting_role_id uuid not null references meeting_roles on delete cascade,
  meeting_id uuid references meetings on delete cascade,
  member_id uuid references members,
  speech_id uuid references speeches(id) on delete set null,
  target_seconds int,
  actual_seconds int,
  notes text,
  created_at timestamptz default now(),
  constraint timer_one_per_speech_per_meeting unique (meeting_id, speech_id),
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
  meeting_id uuid references meetings(id) on delete cascade,
  voter_id uuid references members(id) on delete set null,
  category text,
  voted_for_member_id uuid references members(id) on delete set null,
  created_at timestamptz default now(),
  constraint votes_category_check
    check (category in ('Best Speaker', 'Best Table Topics Speaker', 'Best Evaluator'))
);

-- One vote per voter per meeting per category (NULL voter_id = anonymous/admin-recorded)
create unique index votes_one_per_voter_per_category
  on votes (meeting_id, voter_id, category)
  where voter_id is not null;

create index votes_meeting_id_idx on votes(meeting_id);
create index votes_voter_id_idx on votes(voter_id);
create index votes_voted_for_member_id_idx on votes(voted_for_member_id);

-- SPEECH COMMENTS
create table speech_comments (
  id uuid primary key default gen_random_uuid(),
  speech_id uuid not null references speeches(id) on delete cascade,
  commenter_id uuid references members(id) on delete set null,
  comment text not null,
  created_at timestamptz default now()
);

create index speech_comments_speech_id_idx on speech_comments(speech_id);
create index speech_comments_commenter_id_idx on speech_comments(commenter_id);

-- SEED ROLES
insert into roles (name) values
('Toastmaster'),
('Speaker'),
('Evaluator'),
('Grammarian'),
('Ah-Counter'),
('Timer'),
('General Evaluator');
