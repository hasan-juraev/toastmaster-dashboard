alter table meeting_roles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_roles'
      and policyname = 'meeting_roles_select_authenticated'
  ) then
    create policy meeting_roles_select_authenticated
      on meeting_roles
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_roles'
      and policyname = 'meeting_roles_insert_authenticated'
  ) then
    create policy meeting_roles_insert_authenticated
      on meeting_roles
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_roles'
      and policyname = 'meeting_roles_update_authenticated'
  ) then
    create policy meeting_roles_update_authenticated
      on meeting_roles
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_roles'
      and policyname = 'meeting_roles_delete_authenticated'
  ) then
    create policy meeting_roles_delete_authenticated
      on meeting_roles
      for delete
      to authenticated
      using (true);
  end if;
end $$;
