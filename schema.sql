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
  unique (meeting_id, role_id) deferrable initially deferred
);

-- SPEECHES
create table speeches (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings on delete cascade,
  speaker_id uuid references members,
  title text,
  manual_time text,
  evaluator_id uuid references members,
  completed boolean default false
);

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
  created_at timestamptz default now()
);

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
  created_at timestamptz default now()
);

-- TIMER
create table timer_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_role_id uuid unique references meeting_roles on delete cascade,
  meeting_id uuid references meetings on delete cascade,
  member_id uuid references members,
  target_seconds int,
  actual_seconds int,
  notes text,
  created_at timestamptz default now()
);

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
