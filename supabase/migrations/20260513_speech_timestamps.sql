alter table speeches
  add column if not exists created_at timestamptz default now();

update speeches
set created_at = now()
where created_at is null;

create index if not exists speeches_meeting_id_idx on speeches (meeting_id);
create index if not exists speeches_speaker_id_idx on speeches (speaker_id);
create index if not exists speeches_evaluator_id_idx on speeches (evaluator_id);
create index if not exists speeches_created_at_idx on speeches (created_at);
