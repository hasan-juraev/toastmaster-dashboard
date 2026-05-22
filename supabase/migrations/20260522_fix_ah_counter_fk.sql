-- Add foreign key constraints to ah_counter_reports (previously bare uuid columns)
-- Add created_at timestamp column (was missing, type had it as optional)
-- Add unique constraint: one count record per speaker per meeting
-- Add supporting indexes

alter table ah_counter_reports
  add constraint ah_counter_reports_meeting_id_fkey
    foreign key (meeting_id) references meetings(id) on delete cascade,
  add constraint ah_counter_reports_speaker_id_fkey
    foreign key (speaker_id) references members(id) on delete set null;

alter table ah_counter_reports
  add column if not exists created_at timestamptz default now();

alter table ah_counter_reports
  add constraint ah_counter_one_per_speaker_per_meeting
  unique (meeting_id, speaker_id);

create index if not exists ah_counter_reports_meeting_id_idx
  on ah_counter_reports(meeting_id);
create index if not exists ah_counter_reports_speaker_id_idx
  on ah_counter_reports(speaker_id);
