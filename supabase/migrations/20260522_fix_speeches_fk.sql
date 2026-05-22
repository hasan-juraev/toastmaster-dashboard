-- Re-add speaker_id and evaluator_id FKs on speeches with explicit ON DELETE SET NULL.
-- Default FK behavior is RESTRICT which would block deleting a member who is
-- assigned as a speaker or evaluator. SET NULL is the correct behaviour here.

alter table speeches
  drop constraint if exists speeches_speaker_id_fkey,
  drop constraint if exists speeches_evaluator_id_fkey;

alter table speeches
  add constraint speeches_speaker_id_fkey
    foreign key (speaker_id) references members(id) on delete set null,
  add constraint speeches_evaluator_id_fkey
    foreign key (evaluator_id) references members(id) on delete set null;
