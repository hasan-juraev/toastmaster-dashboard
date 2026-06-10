-- Club-wide settings (single row, enforced by check constraint)
create table if not exists club_settings (
  id                       int primary key default 1 check (id = 1),
  total_meetings_override  integer,
  updated_at               timestamptz default now()
);

-- Seed the single row
insert into club_settings (id) values (1) on conflict do nothing;

alter table club_settings enable row level security;

create policy "club_settings: all authenticated can read"
  on club_settings for select
  using (auth.role() = 'authenticated');

create policy "club_settings: admin or super_admin can update"
  on club_settings for update
  using (get_my_club_role() in ('admin', 'super_admin'));
