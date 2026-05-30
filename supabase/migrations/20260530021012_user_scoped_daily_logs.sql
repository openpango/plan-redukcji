create extension if not exists pgcrypto;

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.daily_logs
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists date date,
  add column if not exists data jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

update public.daily_logs
set id = gen_random_uuid()
where id is null;

alter table public.daily_logs
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column data set default '{}'::jsonb,
  alter column data set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
declare
  pk_name text;
begin
  select conname
    into pk_name
  from pg_constraint
  where conrelid = 'public.daily_logs'::regclass
    and contype = 'p';

  if pk_name is not null and pk_name <> 'daily_logs_pkey' then
    execute format('alter table public.daily_logs drop constraint %I', pk_name);
  elsif pk_name = 'daily_logs_pkey' then
    execute 'alter table public.daily_logs drop constraint daily_logs_pkey';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.daily_logs'::regclass
      and conname = 'daily_logs_pkey'
  ) then
    alter table public.daily_logs
      add constraint daily_logs_pkey primary key (id);
  end if;
end $$;

create unique index if not exists daily_logs_user_date_key
  on public.daily_logs (user_id, date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row
  execute function public.set_updated_at();

alter table public.daily_logs enable row level security;
alter table public.daily_logs force row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.daily_logs to authenticated;

drop policy if exists "Users can read their own daily logs" on public.daily_logs;
create policy "Users can read their own daily logs"
  on public.daily_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own daily logs" on public.daily_logs;
create policy "Users can insert their own daily logs"
  on public.daily_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own daily logs" on public.daily_logs;
create policy "Users can update their own daily logs"
  on public.daily_logs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own daily logs" on public.daily_logs;
create policy "Users can delete their own daily logs"
  on public.daily_logs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
