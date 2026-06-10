-- =============================================================
-- Super Admin Role + Guest Role
-- - Adds super_admin and guest to club_role
-- - super_admin is auto-assigned to hbycleverboy777@gmail.com
-- - Admin cannot edit/delete another admin or super_admin
-- - Super_admin can manage all roles
-- =============================================================

-- 1. Extend club_role check constraint
alter table profiles drop constraint if exists profiles_club_role_check;
alter table profiles add constraint profiles_club_role_check
  check (club_role in ('super_admin', 'admin', 'member', 'guest'));

-- 2. Auto-assign super_admin on signup for the designated email
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, club_role) values (
    new.id,
    case when lower(new.email) = 'hbycleverboy777@gmail.com' then 'super_admin' else 'member' end
  );
  return new;
end;
$$;

-- 3. Seed super_admin for existing account (idempotent)
update profiles set club_role = 'super_admin'
where id = (select id from auth.users where lower(email) = 'hbycleverboy777@gmail.com' limit 1)
  and club_role <> 'super_admin';

-- =============================================================
-- 4. Update RLS policies: extend admin policies to super_admin
-- =============================================================

-- profiles: let super_admin read all profiles
create policy "profiles: super_admin read all"
  on profiles for select using (get_my_club_role() = 'super_admin');

-- profiles: let super_admin update any profile (for role changes)
create policy "profiles: super_admin update any"
  on profiles for update using (get_my_club_role() = 'super_admin');

-- members: replace admin-only policies with admin|super_admin
drop policy if exists "members: admin insert" on members;
drop policy if exists "members: admin update" on members;
drop policy if exists "members: admin delete" on members;

create policy "members: admin or super_admin insert"
  on members for insert
  with check (get_my_club_role() in ('admin', 'super_admin'));

-- Admin cannot update a member who is also an admin or super_admin
create policy "members: admin update non-admin"
  on members for update
  using (
    get_my_club_role() = 'admin'
    and not exists (
      select 1 from profiles p
      where p.member_id = members.id
        and p.club_role in ('admin', 'super_admin')
    )
  );

create policy "members: super_admin update any"
  on members for update
  using (get_my_club_role() = 'super_admin');

-- Admin cannot delete a member who is also an admin or super_admin
create policy "members: admin delete non-admin"
  on members for delete
  using (
    get_my_club_role() = 'admin'
    and not exists (
      select 1 from profiles p
      where p.member_id = members.id
        and p.club_role in ('admin', 'super_admin')
    )
  );

create policy "members: super_admin delete any"
  on members for delete
  using (get_my_club_role() = 'super_admin');

-- meetings: extend to super_admin
drop policy if exists "meetings: admin insert" on meetings;
drop policy if exists "meetings: admin update" on meetings;

create policy "meetings: admin or super_admin insert"
  on meetings for insert
  with check (get_my_club_role() in ('admin', 'super_admin'));

create policy "meetings: admin or super_admin update"
  on meetings for update
  using (get_my_club_role() in ('admin', 'super_admin'));

-- meeting_roles: extend to super_admin
drop policy if exists "meeting_roles: admin full access" on meeting_roles;

create policy "meeting_roles: admin or super_admin full access"
  on meeting_roles for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- speeches: extend to super_admin
drop policy if exists "speeches: admin full access" on speeches;

create policy "speeches: admin or super_admin full access"
  on speeches for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- grammarian_reports: extend to super_admin
drop policy if exists "grammarian_reports: admin full access" on grammarian_reports;

create policy "grammarian_reports: admin or super_admin full access"
  on grammarian_reports for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- ah_counter_reports: extend to super_admin
drop policy if exists "ah_counter_reports: admin full access" on ah_counter_reports;

create policy "ah_counter_reports: admin or super_admin full access"
  on ah_counter_reports for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- evaluator_reports: extend to super_admin
drop policy if exists "evaluator_reports: admin full access" on evaluator_reports;

create policy "evaluator_reports: admin or super_admin full access"
  on evaluator_reports for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- timer_reports: extend to super_admin
drop policy if exists "timer_reports: admin full access" on timer_reports;

create policy "timer_reports: admin or super_admin full access"
  on timer_reports for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- votes: extend to super_admin
drop policy if exists "votes: admin full access" on votes;

create policy "votes: admin or super_admin full access"
  on votes for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- speech_comments: extend to super_admin
drop policy if exists "speech_comments: admin full access" on speech_comments;

create policy "speech_comments: admin or super_admin full access"
  on speech_comments for all
  using (get_my_club_role() in ('admin', 'super_admin'));

-- =============================================================
-- 5. Update delete_member RPC: enforce role hierarchy
-- =============================================================

create or replace function delete_member(p_member_id uuid)
returns void language plpgsql security definer as $$
declare
  v_caller_role text;
  v_target_role text;
begin
  v_caller_role := get_my_club_role();

  if v_caller_role not in ('admin', 'super_admin') then
    raise exception 'Only admins can delete members';
  end if;

  -- Get the target member's club_role (if they have a linked profile)
  select club_role into v_target_role
  from profiles where member_id = p_member_id
  limit 1;

  -- Admin cannot delete another admin or super_admin
  if v_caller_role = 'admin' and v_target_role in ('admin', 'super_admin') then
    raise exception 'Admins cannot delete other admins';
  end if;

  -- Nullify all nullable FK references (preserves historical records)
  update meeting_roles      set member_id    = null where member_id    = p_member_id;
  update speeches           set speaker_id   = null where speaker_id   = p_member_id;
  update speeches           set evaluator_id = null where evaluator_id = p_member_id;
  update grammarian_reports set member_id    = null where member_id    = p_member_id;
  update ah_counter_reports set speaker_id   = null where speaker_id   = p_member_id;
  update evaluator_reports  set member_id    = null where member_id    = p_member_id;
  update timer_reports      set member_id    = null where member_id    = p_member_id;
  update speech_comments    set commenter_id = null where commenter_id = p_member_id;
  update profiles           set member_id    = null where member_id    = p_member_id;

  delete from votes
  where voter_id = p_member_id or voted_for_member_id = p_member_id;

  delete from members where id = p_member_id;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

-- =============================================================
-- 6. RPC: super_admin sets a member's club_role
-- =============================================================

create or replace function set_member_club_role(p_member_id uuid, p_role text)
returns void language plpgsql security definer as $$
begin
  if get_my_club_role() <> 'super_admin' then
    raise exception 'Only super admins can change club roles';
  end if;

  if p_role not in ('admin', 'member', 'guest') then
    raise exception 'Invalid role. Must be admin, member, or guest';
  end if;

  update profiles set club_role = p_role
  where member_id = p_member_id;

  -- If no profile is linked yet, nothing happens (member hasn't signed up)
end;
$$;

-- =============================================================
-- 7. RPC: return members with their club_role (admin/super_admin only)
-- =============================================================

create or replace function get_members_with_roles()
returns table (
  id         uuid,
  name       text,
  email      text,
  active     boolean,
  created_at timestamptz,
  club_role  text
) language plpgsql security definer stable as $$
begin
  if get_my_club_role() not in ('admin', 'super_admin') then
    raise exception 'Access denied';
  end if;

  return query
    select m.id, m.name, m.email, m.active, m.created_at,
           coalesce(p.club_role, 'member') as club_role
    from members m
    left join profiles p on p.member_id = m.id
    order by m.name;
end;
$$;
