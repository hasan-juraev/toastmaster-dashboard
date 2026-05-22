-- Add speech_comments table for post-speech feedback from any member.
-- Each comment belongs to a speech and is authored by a member.
-- Deleting a speech cascades to its comments; deleting a member nulls the author.

create table speech_comments (
  id uuid primary key default gen_random_uuid(),
  speech_id uuid not null references speeches(id) on delete cascade,
  commenter_id uuid references members(id) on delete set null,
  comment text not null,
  created_at timestamptz default now()
);

create index speech_comments_speech_id_idx on speech_comments(speech_id);
create index speech_comments_commenter_id_idx on speech_comments(commenter_id);
