-- Replace partial unique index with a plain unique constraint so PostgREST
-- can resolve ON CONFLICT (meeting_id, voter_id, category).
-- voter_id is always set (authenticated user), so NOT NULL is safe.

drop index if exists votes_one_per_voter_per_category;

alter table votes
  alter column voter_id set not null;

alter table votes
  add constraint votes_unique_voter_category
    unique (meeting_id, voter_id, category);
