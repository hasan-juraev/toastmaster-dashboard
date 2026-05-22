begin;

insert into roles (name) values
  ('Toastmaster'),
  ('Speaker'),
  ('Evaluator'),
  ('Grammarian'),
  ('Ah-Counter'),
  ('Timer'),
  ('General Evaluator')
on conflict (name) do nothing;

insert into members (id, name, email, active) values
  ('00000000-0000-0000-0000-000000000101', 'Hasan Kim', 'hasan.kim@example.com', true),
  ('00000000-0000-0000-0000-000000000102', 'Mia Chen', 'mia.chen@example.com', true),
  ('00000000-0000-0000-0000-000000000103', 'Alex Park', 'alex.park@example.com', true),
  ('00000000-0000-0000-0000-000000000104', 'Sofia Lee', 'sofia.lee@example.com', true),
  ('00000000-0000-0000-0000-000000000105', 'Daniel Choi', 'daniel.choi@example.com', true),
  ('00000000-0000-0000-0000-000000000106', 'Emma Johnson', 'emma.johnson@example.com', true),
  ('00000000-0000-0000-0000-000000000107', 'Noah Patel', 'noah.patel@example.com', true),
  ('00000000-0000-0000-0000-000000000108', 'Grace Kim', 'grace.kim@example.com', true),
  ('00000000-0000-0000-0000-000000000109', 'Ethan Nguyen', 'ethan.nguyen@example.com', true),
  ('00000000-0000-0000-0000-000000000110', 'Olivia Brown', 'olivia.brown@example.com', false)
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  active = excluded.active;

insert into meetings (id, date, theme, location, status) values
  ('00000000-0000-0000-0000-000000000201', '2026-02-06', 'Spring Kickoff', 'Seoul Innovation Hub', 'completed'),
  ('00000000-0000-0000-0000-000000000202', '2026-03-13', 'Storytelling Lab', 'Gangnam Community Center', 'completed'),
  ('00000000-0000-0000-0000-000000000203', '2026-04-10', 'Leadership in Motion', 'Mapo Startup Lounge', 'completed'),
  ('00000000-0000-0000-0000-000000000204', '2026-05-08', 'Humor and Timing', 'Yongsan Cultural Hall', 'completed'),
  ('00000000-0000-0000-0000-000000000205', '2026-05-22', 'Voices of Change', 'Jongno Learning Studio', 'upcoming')
on conflict (id) do update
set
  date = excluded.date,
  theme = excluded.theme,
  location = excluded.location,
  status = excluded.status;

insert into speeches (
  id,
  meeting_id,
  speaker_id,
  title,
  manual_time,
  evaluator_id,
  completed
) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'A Fresh Start', '5-7 min', '00000000-0000-0000-0000-000000000105', true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'Small Wins, Big Momentum', '5-7 min', '00000000-0000-0000-0000-000000000106', true),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', 'The Power of Pausing', '5-7 min', '00000000-0000-0000-0000-000000000107', true),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000104', 'Lessons from My First Marathon', '5-7 min', '00000000-0000-0000-0000-000000000108', true),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000105', 'Feedback that Builds Trust', '5-7 min', '00000000-0000-0000-0000-000000000101', true),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000106', 'Designing Better Habits', '5-7 min', '00000000-0000-0000-0000-000000000102', true),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000107', 'When Humor Saves the Room', '5-7 min', '00000000-0000-0000-0000-000000000103', true),
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000108', 'Timing Is a Leadership Skill', '5-7 min', '00000000-0000-0000-0000-000000000104', true),
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000101', 'Finding My Voice Again', '5-7 min', '00000000-0000-0000-0000-000000000105', false),
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000109', 'What I Learned from Failing Fast', '5-7 min', '00000000-0000-0000-0000-000000000106', false)
on conflict (id) do update
set
  meeting_id = excluded.meeting_id,
  speaker_id = excluded.speaker_id,
  title = excluded.title,
  manual_time = excluded.manual_time,
  evaluator_id = excluded.evaluator_id,
  completed = excluded.completed;

with assignment_seed (
  id,
  meeting_id,
  role_name,
  member_id,
  status,
  completed_at,
  notes,
  score
) as (
  select
    id::uuid,
    meeting_id::uuid,
    role_name,
    member_id::uuid,
    status,
    completed_at,
    notes,
    score
  from (
    values
      ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', 'Toastmaster', '00000000-0000-0000-0000-000000000103', 'completed', '2026-02-06T09:05:00+09:00', 'Opened with clear energy and pacing.', 8.5),
      ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000201', 'Speaker', '00000000-0000-0000-0000-000000000101', 'completed', '2026-02-06T09:00:00+09:00', 'Speech lineup delivered as planned.', null),
      ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000201', 'Evaluator', '00000000-0000-0000-0000-000000000105', 'completed', '2026-02-06T09:30:00+09:00', 'Evaluations were concise and actionable.', null),
      ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000201', 'Grammarian', '00000000-0000-0000-0000-000000000107', 'completed', '2026-02-06T09:35:00+09:00', 'Captured repeated filler patterns well.', null),
      ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000201', 'Ah-Counter', '00000000-0000-0000-0000-000000000108', 'completed', '2026-02-06T09:36:00+09:00', 'Shared clear filler breakdowns by speaker.', null),
      ('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000201', 'Timer', '00000000-0000-0000-0000-000000000109', 'completed', '2026-02-06T09:37:00+09:00', 'Timing kept transitions on track.', null),
      ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000201', 'General Evaluator', '00000000-0000-0000-0000-000000000104', 'completed', '2026-02-06T09:40:00+09:00', 'Closed with balanced overall feedback.', 8.0),
      ('00000000-0000-0000-0000-000000000408', '00000000-0000-0000-0000-000000000202', 'Toastmaster', '00000000-0000-0000-0000-000000000104', 'completed', '2026-03-13T09:05:00+09:00', 'Maintained strong transitions between sections.', 8.0),
      ('00000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-000000000202', 'Speaker', '00000000-0000-0000-0000-000000000103', 'completed', '2026-03-13T09:00:00+09:00', 'Both speakers were prepared and ready.', null),
      ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000202', 'Evaluator', '00000000-0000-0000-0000-000000000107', 'completed', '2026-03-13T09:30:00+09:00', 'Evaluation linked well to objectives.', null),
      ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000202', 'Grammarian', '00000000-0000-0000-0000-000000000108', 'completed', '2026-03-13T09:35:00+09:00', 'Strong language observations and examples.', null),
      ('00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000202', 'Ah-Counter', '00000000-0000-0000-0000-000000000109', 'completed', '2026-03-13T09:36:00+09:00', 'Spotted habitual connectors quickly.', null),
      ('00000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000202', 'Timer', '00000000-0000-0000-0000-000000000101', 'completed', '2026-03-13T09:37:00+09:00', 'All timing signals were clear and on cue.', null),
      ('00000000-0000-0000-0000-000000000414', '00000000-0000-0000-0000-000000000202', 'General Evaluator', '00000000-0000-0000-0000-000000000106', 'completed', '2026-03-13T09:40:00+09:00', 'Summarized meeting strengths with practical next steps.', 8.5),
      ('00000000-0000-0000-0000-000000000415', '00000000-0000-0000-0000-000000000203', 'Toastmaster', '00000000-0000-0000-0000-000000000105', 'completed', '2026-04-10T09:05:00+09:00', 'Set a calm pace and kept the agenda moving.', 9.0),
      ('00000000-0000-0000-0000-000000000416', '00000000-0000-0000-0000-000000000203', 'Speaker', '00000000-0000-0000-0000-000000000106', 'completed', '2026-04-10T09:00:00+09:00', 'Speaker lineup was fully covered.', null),
      ('00000000-0000-0000-0000-000000000417', '00000000-0000-0000-0000-000000000203', 'Evaluator', '00000000-0000-0000-0000-000000000101', 'completed', '2026-04-10T09:30:00+09:00', 'Evaluation feedback was specific and warm.', null),
      ('00000000-0000-0000-0000-000000000418', '00000000-0000-0000-0000-000000000203', 'Grammarian', '00000000-0000-0000-0000-000000000102', 'completed', '2026-04-10T09:35:00+09:00', 'Great balance of corrections and praise.', null),
      ('00000000-0000-0000-0000-000000000419', '00000000-0000-0000-0000-000000000203', 'Ah-Counter', '00000000-0000-0000-0000-000000000103', 'completed', '2026-04-10T09:36:00+09:00', 'Filler report was concise and useful.', null),
      ('00000000-0000-0000-0000-000000000420', '00000000-0000-0000-0000-000000000203', 'Timer', '00000000-0000-0000-0000-000000000104', 'completed', '2026-04-10T09:37:00+09:00', 'Timing stayed within narrow margins.', null),
      ('00000000-0000-0000-0000-000000000421', '00000000-0000-0000-0000-000000000203', 'General Evaluator', '00000000-0000-0000-0000-000000000107', 'completed', '2026-04-10T09:40:00+09:00', 'Final feedback highlighted team consistency.', 8.5),
      ('00000000-0000-0000-0000-000000000422', '00000000-0000-0000-0000-000000000204', 'Toastmaster', '00000000-0000-0000-0000-000000000108', 'completed', '2026-05-08T09:05:00+09:00', 'Ran the room with excellent energy and humor.', 9.5),
      ('00000000-0000-0000-0000-000000000423', '00000000-0000-0000-0000-000000000204', 'Speaker', '00000000-0000-0000-0000-000000000107', 'completed', '2026-05-08T09:00:00+09:00', 'Speech flow felt polished and confident.', null),
      ('00000000-0000-0000-0000-000000000424', '00000000-0000-0000-0000-000000000204', 'Evaluator', '00000000-0000-0000-0000-000000000103', 'completed', '2026-05-08T09:30:00+09:00', 'Evaluations landed well with the speakers.', null),
      ('00000000-0000-0000-0000-000000000425', '00000000-0000-0000-0000-000000000204', 'Grammarian', '00000000-0000-0000-0000-000000000104', 'completed', '2026-05-08T09:35:00+09:00', 'Offered strong language and word choice notes.', null),
      ('00000000-0000-0000-0000-000000000426', '00000000-0000-0000-0000-000000000204', 'Ah-Counter', '00000000-0000-0000-0000-000000000105', 'completed', '2026-05-08T09:36:00+09:00', 'Captured fewer fillers as delivery improved.', null),
      ('00000000-0000-0000-0000-000000000427', '00000000-0000-0000-0000-000000000204', 'Timer', '00000000-0000-0000-0000-000000000106', 'completed', '2026-05-08T09:37:00+09:00', 'Timing cards stayed visible and well-paced.', null),
      ('00000000-0000-0000-0000-000000000428', '00000000-0000-0000-0000-000000000204', 'General Evaluator', '00000000-0000-0000-0000-000000000109', 'completed', '2026-05-08T09:40:00+09:00', 'Closed the meeting with crisp recommendations.', 9.0),
      ('00000000-0000-0000-0000-000000000429', '00000000-0000-0000-0000-000000000205', 'Toastmaster', '00000000-0000-0000-0000-000000000102', 'assigned', null, 'Preparing the opening and transitions.', null),
      ('00000000-0000-0000-0000-000000000430', '00000000-0000-0000-0000-000000000205', 'Speaker', '00000000-0000-0000-0000-000000000101', 'assigned', null, 'Two speakers are confirmed for the agenda.', null),
      ('00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000205', 'Evaluator', '00000000-0000-0000-0000-000000000105', 'assigned', null, 'Evaluator pairings are drafted.', null),
      ('00000000-0000-0000-0000-000000000432', '00000000-0000-0000-0000-000000000205', 'Grammarian', '00000000-0000-0000-0000-000000000107', 'in_progress', null, 'Preparing word-of-the-day and language notes.', null),
      ('00000000-0000-0000-0000-000000000433', '00000000-0000-0000-0000-000000000205', 'Ah-Counter', '00000000-0000-0000-0000-000000000108', 'assigned', null, 'Ready to track fillers for both speakers.', null),
      ('00000000-0000-0000-0000-000000000434', '00000000-0000-0000-0000-000000000205', 'Timer', '00000000-0000-0000-0000-000000000109', 'assigned', null, 'Timing cards prepared for the next meeting.', null),
      ('00000000-0000-0000-0000-000000000435', '00000000-0000-0000-0000-000000000205', 'General Evaluator', '00000000-0000-0000-0000-000000000104', 'assigned', null, 'Reviewing role coverage before meeting day.', null)
  ) as seed(id, meeting_id, role_name, member_id, status, completed_at, notes, score)
)
insert into meeting_roles (
  id,
  meeting_id,
  role_id,
  member_id,
  status,
  completed_at,
  notes,
  score
)
select
  assignment_seed.id,
  assignment_seed.meeting_id,
  roles.id,
  assignment_seed.member_id,
  assignment_seed.status,
  assignment_seed.completed_at::timestamptz,
  assignment_seed.notes,
  assignment_seed.score
from assignment_seed
join roles on roles.name = assignment_seed.role_name
on conflict (id) do update
set
  meeting_id = excluded.meeting_id,
  role_id = excluded.role_id,
  member_id = excluded.member_id,
  status = excluded.status,
  completed_at = excluded.completed_at,
  notes = excluded.notes,
  score = excluded.score;

with grammarian_seed (
  id,
  meeting_id,
  role_name,
  member_id,
  grammar_errors,
  notable_phrases,
  score,
  notes
) as (
  select
    id::uuid,
    meeting_id::uuid,
    role_name,
    member_id::uuid,
    grammar_errors,
    notable_phrases,
    score,
    notes
  from (
    values
      ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000201', 'Grammarian', '00000000-0000-0000-0000-000000000107', 6, 4, 7.5, 'Common repeats were "actually" and "basically".'),
      ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000202', 'Grammarian', '00000000-0000-0000-0000-000000000108', 4, 6, 8.5, 'Great improvement in sentence variety across both speakers.'),
      ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000203', 'Grammarian', '00000000-0000-0000-0000-000000000102', 3, 5, 9.0, 'Only a few slips; overall language quality was strong.'),
      ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000204', 'Grammarian', '00000000-0000-0000-0000-000000000104', 2, 7, 9.5, 'Excellent use of vivid language and memorable phrasing.')
  ) as seed(id, meeting_id, role_name, member_id, grammar_errors, notable_phrases, score, notes)
)
insert into grammarian_reports (
  id,
  meeting_role_id,
  meeting_id,
  member_id,
  grammar_errors,
  notable_phrases,
  score,
  notes
)
select
  grammarian_seed.id,
  meeting_roles.id,
  grammarian_seed.meeting_id,
  grammarian_seed.member_id,
  grammarian_seed.grammar_errors,
  grammarian_seed.notable_phrases,
  grammarian_seed.score,
  grammarian_seed.notes
from grammarian_seed
join roles on roles.name = grammarian_seed.role_name
join meeting_roles
  on meeting_roles.meeting_id = grammarian_seed.meeting_id
 and meeting_roles.role_id = roles.id
on conflict (meeting_role_id) do update
set
  member_id = excluded.member_id,
  grammar_errors = excluded.grammar_errors,
  notable_phrases = excluded.notable_phrases,
  score = excluded.score,
  notes = excluded.notes,
  meeting_id = excluded.meeting_id;

with evaluator_seed (
  id,
  meeting_id,
  role_name,
  member_id,
  speech_id,
  quality_score,
  strengths,
  improvement_notes
) as (
  select
    id::uuid,
    meeting_id::uuid,
    role_name,
    member_id::uuid,
    speech_id::uuid,
    quality_score,
    strengths,
    improvement_notes
  from (
    values
      ('00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000201', 'Evaluator', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000301', 8.0, 'Clear structure and supportive delivery.', 'Tighten the final summary so the action points land faster.'),
      ('00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000202', 'Evaluator', '00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000303', 8.5, 'Well connected feedback to the speaker goals.', 'Could add one more concrete example from the speech body.'),
      ('00000000-0000-0000-0000-000000000513', '00000000-0000-0000-0000-000000000203', 'Evaluator', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000305', 9.0, 'Warm tone and very actionable suggestions.', 'Leave a brief pause after the main recommendation to make it stick.'),
      ('00000000-0000-0000-0000-000000000514', '00000000-0000-0000-0000-000000000204', 'Evaluator', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000307', 8.0, 'Good balance between encouragement and challenge.', 'A slightly stronger opening frame would sharpen the evaluation.')
  ) as seed(id, meeting_id, role_name, member_id, speech_id, quality_score, strengths, improvement_notes)
)
insert into evaluator_reports (
  id,
  meeting_role_id,
  meeting_id,
  member_id,
  speech_id,
  quality_score,
  strengths,
  improvement_notes
)
select
  evaluator_seed.id,
  meeting_roles.id,
  evaluator_seed.meeting_id,
  evaluator_seed.member_id,
  evaluator_seed.speech_id,
  evaluator_seed.quality_score,
  evaluator_seed.strengths,
  evaluator_seed.improvement_notes
from evaluator_seed
join roles on roles.name = evaluator_seed.role_name
join meeting_roles
  on meeting_roles.meeting_id = evaluator_seed.meeting_id
 and meeting_roles.role_id = roles.id
on conflict (meeting_role_id) do update
set
  member_id = excluded.member_id,
  speech_id = excluded.speech_id,
  quality_score = excluded.quality_score,
  strengths = excluded.strengths,
  improvement_notes = excluded.improvement_notes,
  meeting_id = excluded.meeting_id;

with timer_seed (
  id,
  meeting_id,
  role_name,
  member_id,
  speech_id,
  target_seconds,
  actual_seconds,
  notes
) as (
  select
    id::uuid,
    meeting_id::uuid,
    role_name,
    member_id::uuid,
    speech_id::uuid,
    target_seconds,
    actual_seconds,
    notes
  from (
    values
      -- Meeting 1 (Feb 6): speeches 301, 302
      ('00000000-0000-0000-0000-000000000521', '00000000-0000-0000-0000-000000000201', 'Timer', '00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000301', 360, 372, 'Slightly over on the opening.'),
      ('00000000-0000-0000-0000-000000000522', '00000000-0000-0000-0000-000000000201', 'Timer', '00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000302', 360, 355, 'Clean finish, just under target.'),
      -- Meeting 2 (Mar 13): speeches 303, 304
      ('00000000-0000-0000-0000-000000000523', '00000000-0000-0000-0000-000000000202', 'Timer', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000303', 420, 414, 'Stayed close to plan.'),
      ('00000000-0000-0000-0000-000000000524', '00000000-0000-0000-0000-000000000202', 'Timer', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000304', 420, 428, 'Slightly over on the second speech.'),
      -- Meeting 3 (Apr 10): speeches 305, 306
      ('00000000-0000-0000-0000-000000000525', '00000000-0000-0000-0000-000000000203', 'Timer', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000305', 360, 358, 'Excellent pacing.'),
      ('00000000-0000-0000-0000-000000000526', '00000000-0000-0000-0000-000000000203', 'Timer', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000306', 360, 362, 'Right on time.'),
      -- Meeting 4 (May 8): speeches 307, 308
      ('00000000-0000-0000-0000-000000000527', '00000000-0000-0000-0000-000000000204', 'Timer', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000307', 420, 418, 'Well paced throughout.'),
      ('00000000-0000-0000-0000-000000000528', '00000000-0000-0000-0000-000000000204', 'Timer', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000308', 420, 435, 'Conclusion ran long.')
  ) as seed(id, meeting_id, role_name, member_id, speech_id, target_seconds, actual_seconds, notes)
)
insert into timer_reports (
  id,
  meeting_role_id,
  meeting_id,
  member_id,
  speech_id,
  target_seconds,
  actual_seconds,
  notes
)
select
  timer_seed.id,
  meeting_roles.id,
  timer_seed.meeting_id,
  timer_seed.member_id,
  timer_seed.speech_id,
  timer_seed.target_seconds,
  timer_seed.actual_seconds,
  timer_seed.notes
from timer_seed
join roles on roles.name = timer_seed.role_name
join meeting_roles
  on meeting_roles.meeting_id = timer_seed.meeting_id
 and meeting_roles.role_id = roles.id
on conflict (meeting_id, speech_id) do update
set
  member_id = excluded.member_id,
  target_seconds = excluded.target_seconds,
  actual_seconds = excluded.actual_seconds,
  notes = excluded.notes;

insert into ah_counter_reports (id, meeting_id, speaker_id, ah_count, notes) values
  ('00000000-0000-0000-0000-000000000531', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 5, 'Mostly "um" during transitions.'),
  ('00000000-0000-0000-0000-000000000532', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 3, 'A few filler words appeared during the opening.'),
  ('00000000-0000-0000-0000-000000000533', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', 4, 'Repeated "like" when changing examples.'),
  ('00000000-0000-0000-0000-000000000534', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000104', 6, 'Most fillers came during the Q&A section.'),
  ('00000000-0000-0000-0000-000000000535', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000105', 2, 'Very clean delivery with only two fillers.'),
  ('00000000-0000-0000-0000-000000000536', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000106', 4, 'Noticeable fillers during the middle section only.'),
  ('00000000-0000-0000-0000-000000000537', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000107', 3, 'Confident pace reduced filler use.'),
  ('00000000-0000-0000-0000-000000000538', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000108', 5, 'A few fillers appeared while building to the punchline.')
on conflict (id) do update
set
  meeting_id = excluded.meeting_id,
  speaker_id = excluded.speaker_id,
  ah_count = excluded.ah_count,
  notes = excluded.notes;

insert into votes (id, meeting_id, voter_id, category, voted_for_member_id) values
  -- Meeting 1 (Feb 6)
  ('00000000-0000-0000-0000-000000000541', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'Best Speaker', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000542', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'Best Evaluator', '00000000-0000-0000-0000-000000000105'),
  ('00000000-0000-0000-0000-000000000549', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'Best Table Topics Speaker', '00000000-0000-0000-0000-000000000106'),
  -- Meeting 2 (Mar 13)
  ('00000000-0000-0000-0000-000000000543', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'Best Speaker', '00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000544', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'Best Evaluator', '00000000-0000-0000-0000-000000000107'),
  ('00000000-0000-0000-0000-000000000550', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', 'Best Table Topics Speaker', '00000000-0000-0000-0000-000000000108'),
  -- Meeting 3 (Apr 10)
  ('00000000-0000-0000-0000-000000000545', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'Best Speaker', '00000000-0000-0000-0000-000000000105'),
  ('00000000-0000-0000-0000-000000000546', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'Best Evaluator', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000551', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'Best Table Topics Speaker', '00000000-0000-0000-0000-000000000109'),
  -- Meeting 4 (May 8)
  ('00000000-0000-0000-0000-000000000547', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000104', 'Best Speaker', '00000000-0000-0000-0000-000000000108'),
  ('00000000-0000-0000-0000-000000000548', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000104', 'Best Evaluator', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000552', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000104', 'Best Table Topics Speaker', '00000000-0000-0000-0000-000000000107')
on conflict (id) do update
set
  meeting_id = excluded.meeting_id,
  voter_id = excluded.voter_id,
  category = excluded.category,
  voted_for_member_id = excluded.voted_for_member_id;

insert into speech_comments (id, speech_id, commenter_id, comment) values
  -- Speech 301: "A Fresh Start"
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000103', 'Great opening hook — you had the room immediately.'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000104', 'Eye contact was strong throughout. Felt very connected.'),
  -- Speech 302: "Small Wins, Big Momentum"
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000105', 'The personal story in the middle really landed for me.'),
  -- Speech 303: "The Power of Pausing"
  ('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000101', 'You demonstrated exactly what you were talking about — well done.'),
  ('00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000108', 'The ending felt a bit rushed, but the buildup was excellent.'),
  -- Speech 305: "Feedback that Builds Trust"
  ('00000000-0000-0000-0000-000000000606', '00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000102', 'Very relevant topic. The framework you shared was practical.'),
  -- Speech 307: "When Humor Saves the Room"
  ('00000000-0000-0000-0000-000000000607', '00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000109', 'Funniest speech I have heard in months. Timing was perfect.'),
  ('00000000-0000-0000-0000-000000000608', '00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000102', 'Would love to see you do more character voices next time.')
on conflict (id) do nothing;

commit;
