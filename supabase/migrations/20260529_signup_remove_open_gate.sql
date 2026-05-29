-- Remove signup_open gate from signup_for_meeting_role.
-- Any unassigned role (member_id IS NULL) is now available for member signup.

create or replace function signup_for_meeting_role(p_meeting_id uuid, p_role_id uuid)
returns role_member_signups language plpgsql security definer as $$
declare
  v_member_id uuid;
  v_result    role_member_signups;
begin
  v_member_id := get_my_member_id();
  if v_member_id is null then
    raise exception 'No member profile linked to this account';
  end if;

  -- Meeting must be upcoming
  if not exists (
    select 1 from meetings where id = p_meeting_id and status = 'upcoming'
  ) then
    raise exception 'Can only sign up for upcoming meetings';
  end if;

  -- Role must exist for this meeting
  if not exists (
    select 1 from meeting_roles
    where meeting_id = p_meeting_id and role_id = p_role_id
  ) then
    raise exception 'This role does not exist for the selected meeting';
  end if;

  -- Admin must not have already assigned someone
  if exists (
    select 1 from meeting_roles
    where meeting_id = p_meeting_id and role_id = p_role_id and member_id is not null
  ) then
    raise exception 'This role has already been assigned by an admin';
  end if;

  -- For single-slot roles: only one member allowed (lock to prevent races)
  if not is_multi_slot_role(p_role_id) then
    perform 1
    from role_member_signups
    where meeting_id = p_meeting_id and role_id = p_role_id
    for update skip locked;

    if found then
      raise exception 'This role is already taken';
    end if;
  end if;

  insert into role_member_signups (meeting_id, role_id, member_id)
  values (p_meeting_id, p_role_id, v_member_id)
  returning * into v_result;

  return v_result;
end;
$$;
