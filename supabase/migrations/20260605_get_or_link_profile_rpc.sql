-- Add case-insensitive index on members.email for fast email matching
create index if not exists members_email_lower_idx on members (lower(email));

-- Single RPC: fetch profile, auto-link by email if unlinked, return result.
-- Replaces 3 sequential client-side calls with 1 server-side transaction.
create or replace function get_or_link_profile(p_user_id uuid, p_email text)
returns setof profiles language plpgsql security definer as $$
declare
  v_profile profiles;
begin
  select * into v_profile from profiles where id = p_user_id;

  -- Profile not found (shouldn't happen — trigger creates it on signup)
  if not found then
    return;
  end if;

  -- Already linked — return immediately
  if v_profile.member_id is not null then
    return next v_profile;
    return;
  end if;

  -- Try to auto-link by email (case-insensitive)
  if p_email is not null then
    update profiles p
    set member_id = m.id
    from members m
    where p.id = p_user_id
      and lower(m.email) = lower(p_email)
      and m.email is not null
    returning p.* into v_profile;
  end if;

  return next v_profile;
end;
$$;
