-- get_members_with_roles
-- Returns all members joined with their club_role from profiles.
-- Uses security definer to bypass the restrictive profiles RLS policy.
-- Accessible to all authenticated users (club members can see who's who).
create or replace function get_members_with_roles()
returns table (
  id         uuid,
  name       text,
  email      text,
  active     boolean,
  created_at timestamptz,
  club_role  text
)
language sql security definer stable as $$
  select
    m.id,
    m.name,
    m.email,
    m.active,
    m.created_at,
    coalesce(p.club_role, 'member') as club_role
  from members m
  left join profiles p on p.member_id = m.id
  order by m.name;
$$;

grant execute on function get_members_with_roles() to authenticated;
