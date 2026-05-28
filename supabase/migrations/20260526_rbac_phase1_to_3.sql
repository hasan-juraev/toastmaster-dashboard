-- =============================================================
-- RBAC Phase 1-A: profiles table
-- Bridges auth.users <-> members, stores club role
-- =============================================================

create table if not exists profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  club_role text not null default 'member'
              check (club_role in ('admin', 'member')),
  created_at timestamptz default now()
);

create index if not exists profiles_member_id_idx on profiles (member_id);

-- Auto-create a profile row on every new signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================================
-- RBAC Phase 1-B: extend meeting_roles and meetings
-- =============================================================

alter table meeting_roles
  add column if not exists signup_open boolean not null default false;

alter table meetings
  add column if not exists theme_question text;

-- =============================================================
-- RBAC Phase 1-C: extend speeches
-- =============================================================

alter table speeches
  add column if not exists speech_plan text;

-- =============================================================
-- RBAC Phase 2: Helper DB functions
-- =============================================================

create or replace function get_my_club_role()
returns text language sql security definer stable as $$
  select club_role from profiles where id = auth.uid();
$$;

create or replace function get_my_member_id()
returns uuid language sql security definer stable as $$
  select member_id from profiles where id = auth.uid();
$$;

create or replace function i_hold_meeting_role(p_meeting_id uuid, p_role_name text)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from meeting_roles mr
    join roles r on r.id = mr.role_id
    where mr.meeting_id = p_meeting_id
      and mr.member_id = get_my_member_id()
      and r.name = p_role_name
  );
$$;

-- =============================================================
-- RBAC Phase 3: Race-condition-safe role claim/unclaim functions
-- =============================================================

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
    and signup_open = true
  for update skip locked;

  if not found then
    raise exception 'Role is no longer available';
  end if;

  update meeting_roles
  set member_id = v_member_id, status = 'assigned'
  where id = p_meeting_role_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function unclaim_meeting_role(p_meeting_role_id uuid)
returns void language plpgsql security definer as $$
begin
  update meeting_roles
  set member_id = null, status = 'unassigned'
  where id = p_meeting_role_id
    and member_id = get_my_member_id();

  if not found then
    raise exception 'Cannot unclaim: role not held by you';
  end if;
end;
$$;

-- =============================================================
-- RBAC Phase 1-D placeholder: seed your first admin
-- Run manually after your account exists:
--
-- update profiles
-- set club_role = 'admin',
--     member_id = (select id from members where email = 'your@email.com' limit 1)
-- where id = (select id from auth.users where email = 'your@email.com' limit 1);
-- =============================================================
