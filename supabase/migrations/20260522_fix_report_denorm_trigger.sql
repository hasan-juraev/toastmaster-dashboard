-- Trigger to keep denormalized meeting_id and member_id in sync with meeting_roles.
-- grammarian_reports, evaluator_reports, and timer_reports all store meeting_id
-- and member_id directly (for query convenience) alongside meeting_role_id.
-- This trigger auto-populates them from the parent meeting_roles row on every
-- insert or update, so they can never drift out of sync.
-- timer_reports trigger is added in the Phase 7 restructure migration.

create or replace function sync_report_from_meeting_role()
returns trigger language plpgsql as $$
begin
  if NEW.meeting_role_id is not null then
    select meeting_id, member_id
    into NEW.meeting_id, NEW.member_id
    from meeting_roles
    where id = NEW.meeting_role_id;
  end if;
  return NEW;
end;
$$;

create trigger grammarian_reports_sync_from_role
  before insert or update on grammarian_reports
  for each row execute function sync_report_from_meeting_role();

create trigger evaluator_reports_sync_from_role
  before insert or update on evaluator_reports
  for each row execute function sync_report_from_meeting_role();
