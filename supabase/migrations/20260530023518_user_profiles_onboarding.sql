create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  height_cm numeric(5, 2) not null,
  start_weight_kg numeric(5, 2) not null,
  goal_weight_kg numeric(5, 2) not null,
  target_date date not null,
  uses_medication boolean not null default false,
  has_injury_or_condition boolean not null default false,
  safety_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint user_profiles_height_positive check (height_cm > 0),
  constraint user_profiles_start_weight_positive check (start_weight_kg > 0),
  constraint user_profiles_goal_weight_positive check (goal_weight_kg > 0)
);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.user_profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
  on public.user_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
