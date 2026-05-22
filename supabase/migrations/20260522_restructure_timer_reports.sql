-- Restructure timer_reports from one-per-timer-role-assignment
-- to one-per-speech-per-meeting (so the Timer can log each speech separately).
--
-- Changes:
--   1. Drop the UNIQUE constraint on meeting_role_id (was 1:1, now 1:many)
--   2. Add speech_id FK → speeches ON DELETE SET NULL
--   3. Add UNIQUE(meeting_id, speech_id) — one timing per speech per meeting
--   4. Enforce NOT NULL on meeting_role_id (deferred from Phase 2)
--   5. Add the denorm sync trigger (from Phase 3, applied here)

-- 1. Drop old unique constraint
alter table timer_reports
  drop constraint if exists timer_reports_meeting_role_id_key;

-- 2. Add speech_id
alter table timer_reports
  add column if not exists speech_id uuid references speeches(id) on delete set null;

create index if not exists timer_reports_speech_id_idx on timer_reports(speech_id);

-- 3. One timing record per speech per meeting
alter table timer_reports
  add constraint timer_one_per_speech_per_meeting
  unique (meeting_id, speech_id);

-- 4. NOT NULL on meeting_role_id
alter table timer_reports
  alter column meeting_role_id set not null;

-- 5. Denorm sync trigger (reuse function created in Phase 3)
create trigger timer_reports_sync_from_role
  before insert or update on timer_reports
  for each row execute function sync_report_from_meeting_role();
