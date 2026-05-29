-- Fix: profiles table has RLS enabled but no INSERT policy.
-- The handle_new_user() trigger (SECURITY DEFINER) fires on new auth user creation
-- and inserts into profiles. Without an INSERT policy for the postgres/service_role,
-- Supabase returns "Database error creating new user" from the Auth dashboard.

-- 1. Recreate the trigger function with set search_path = '' (Supabase best practice
--    for SECURITY DEFINER functions; prevents search_path injection and resolves schema
--    lookup correctly in all Supabase environments).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

-- 2. Add an INSERT policy restricted to postgres and service_role.
--    The trigger runs as the function owner (postgres, which has BYPASSRLS), but some
--    Supabase project configurations do not guarantee BYPASSRLS for postgres.
--    This explicit policy is the reliable failsafe.
create policy "profiles: service role insert"
  on public.profiles for insert
  to postgres, service_role
  with check (true);
