-- Auto-seed all roles into meeting_roles when a new meeting is created.
-- Every role is immediately available for member signup (signup_open = true).
-- Admins can still override assignments or toggle signup_open per role.

create or replace function seed_meeting_roles_on_insert()
returns trigger language plpgsql security definer as $$
begin
  insert into meeting_roles (meeting_id, role_id, signup_open)
  select new.id, r.id, true
  from roles r
  on conflict (meeting_id, role_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_meeting_created on meetings;
create trigger on_meeting_created
  after insert on meetings
  for each row execute procedure seed_meeting_roles_on_insert();

-- Backfill existing meetings that have no role rows yet
insert into meeting_roles (meeting_id, role_id, signup_open)
select m.id, r.id, true
from meetings m
cross join roles r
on conflict (meeting_id, role_id) do nothing;

-- Remove signup_open gate from claim_meeting_role so it matches
-- signup_for_meeting_role behaviour (any unassigned role is claimable).
create or replace function claim_meeting_role(p_meeting_role_id uuid)
returns meeting_roles language plpgsql security definer as $$
declare
  v_member_id uuid;
  v_result    meeting_roles;
begin
  v_member_id := get_my_member_id();
  if v_member_id is null then
    raise exception 'No member profile linked to this account';
  end if;

  -- Lock the row; skip if someone else is claiming simultaneously
  select * into v_result
  from meeting_roles
  where id = p_meeting_role_id
    and member_id is null
  for update skip locked;

  if not found then
    raise exception 'Role is no longer available';
  end if;

  update meeting_roles
  set member_id = v_member_id,
      status    = 'assigned'
  where id = p_meeting_role_id
  returning * into v_result;

  return v_result;
end;
$$;
