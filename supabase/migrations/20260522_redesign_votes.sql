-- Redesign votes table:
-- 1. Add voter_id to track who cast each vote
-- 2. Add created_at for auditability
-- 3. Add FK constraints on meeting_id and voted_for_member_id (previously bare uuids)
-- 4. Add CHECK constraint on category (3 valid values)
-- 5. Add partial unique index to prevent one voter voting twice per category per meeting
-- 6. Add supporting indexes

alter table votes
  add column voter_id uuid references members(id) on delete set null,
  add column created_at timestamptz default now();

alter table votes
  add constraint votes_meeting_id_fkey
    foreign key (meeting_id) references meetings(id) on delete cascade,
  add constraint votes_voted_for_member_id_fkey
    foreign key (voted_for_member_id) references members(id) on delete set null;

alter table votes
  add constraint votes_category_check
  check (category in ('Best Speaker', 'Best Table Topics Speaker', 'Best Evaluator'));

-- Partial unique index: one vote per voter per meeting per category.
-- Allows NULL voter_id (admin-recorded / anonymous votes) to coexist.
create unique index votes_one_per_voter_per_category
  on votes (meeting_id, voter_id, category)
  where voter_id is not null;

create index votes_meeting_id_idx on votes(meeting_id);
create index votes_voter_id_idx on votes(voter_id);
create index votes_voted_for_member_id_idx on votes(voted_for_member_id);
