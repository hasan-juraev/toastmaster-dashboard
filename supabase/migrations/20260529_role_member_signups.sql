-- Member role sign-up table (separate from admin-managed meeting_roles.member_id)

create table if not exists role_member_signups (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  role_id    uuid not null references roles(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz default now(),
  unique (meeting_id, role_id, member_id)
);

create index if not exists role_member_signups_meeting_idx on role_member_signups (meeting_id);
create index if not exists role_member_signups_member_idx  on role_member_signups (member_id);

alter table role_member_signups enable row level security;

create policy "Authenticated users can read role signups"
  on role_member_signups for select to authenticated using (true);

create policy "Members can sign themselves up"
  on role_member_signups for insert to authenticated
  with check (member_id = get_my_member_id());

create policy "Members can withdraw their own signup"
  on role_member_signups for delete to authenticated
  using (member_id = get_my_member_id());

-- Speaker and Evaluator are multi-slot: many members can sign up
create or replace function is_multi_slot_role(p_role_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from roles where id = p_role_id and name in ('Speaker', 'Evaluator')
  );
$$;

-- Race-condition-safe signup
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

  -- signup_open must be true for this role
  if not exists (
    select 1 from meeting_roles
    where meeting_id = p_meeting_id and role_id = p_role_id and signup_open = true
  ) then
    raise exception 'Sign-up is not open for this role';
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

-- Withdraw from a role
create or replace function withdraw_from_meeting_role(p_meeting_id uuid, p_role_id uuid)
returns void language plpgsql security definer as $$
declare
  v_member_id uuid;
begin
  v_member_id := get_my_member_id();
  if v_member_id is null then
    raise exception 'No member profile linked to this account';
  end if;

  delete from role_member_signups
  where meeting_id = p_meeting_id
    and role_id    = p_role_id
    and member_id  = v_member_id;

  if not found then
    raise exception 'You are not signed up for this role';
  end if;
end;
$$;
