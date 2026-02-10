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
  meeting_id uuid,
  speaker_id uuid,
  grammar_errors int default 0,
  notes text
);

-- AH COUNTER
create table ah_counter_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid,
  speaker_id uuid,
  ah_count int default 0,
  notes text
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
