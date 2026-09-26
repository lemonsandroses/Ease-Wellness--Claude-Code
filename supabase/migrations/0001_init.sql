-- Ease — initial schema
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
--
-- Every table is row-level-secured so a signed-in user can only ever reach
-- their own rows. The anon key shipped in the browser bundle is useless
-- without a valid session, and a session only ever unlocks that user's data.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  name               text not null default '',
  birth_date         date,
  cycle_length       smallint not null default 28 check (cycle_length between 15 and 90),
  period_length      smallint not null default 5  check (period_length between 1 and 15),
  last_period_start  date,
  focus              text[] not null default '{}',
  baseline_symptoms  text[] not null default '{}',
  energy_rhythm      text,
  sleep_tendency     text,
  movement_style     text,
  onboarded_at       date,
  updated_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile: read"   on public.profiles for select using  (auth.uid() = id);
create policy "own profile: insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile: update" on public.profiles for update using  (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile: delete" on public.profiles for delete using  (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- day_logs: one row per user per day. The date is part of the key, so saving
-- the same day twice updates rather than duplicating.
-- ---------------------------------------------------------------------------
create table if not exists public.day_logs (
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  bleeding      text not null default 'none'
                check (bleeding in ('none','spotting','light','medium','heavy')),
  symptoms      jsonb not null default '{}'::jsonb,
  energy        smallint check (energy between 1 and 5),
  mood          text,
  sleep_hours   numeric(3,1) check (sleep_hours between 0 and 24),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  stress        smallint check (stress between 1 and 5),
  water         smallint check (water between 0 and 30),
  movement      text,
  notes         text,
  logged_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.day_logs enable row level security;

create policy "own logs: read"   on public.day_logs for select using  (auth.uid() = user_id);
create policy "own logs: insert" on public.day_logs for insert with check (auth.uid() = user_id);
create policy "own logs: update" on public.day_logs for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs: delete" on public.day_logs for delete using  (auth.uid() = user_id);

create index if not exists day_logs_user_date_idx on public.day_logs (user_id, date desc);

-- ---------------------------------------------------------------------------
-- meals
-- ---------------------------------------------------------------------------
create table if not exists public.meals (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  name       text not null,
  slot       text not null check (slot in ('breakfast','lunch','dinner','snack')),
  calories   integer      not null default 0 check (calories >= 0),
  protein    numeric(5,1) not null default 0 check (protein  >= 0),
  carbs      numeric(5,1) not null default 0 check (carbs    >= 0),
  fats       numeric(5,1) not null default 0 check (fats     >= 0),
  fibre      numeric(5,1) not null default 0 check (fibre    >= 0),
  nutrients  text[] not null default '{}',
  note       text,
  logged_at  timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "own meals: read"   on public.meals for select using  (auth.uid() = user_id);
create policy "own meals: insert" on public.meals for insert with check (auth.uid() = user_id);
create policy "own meals: update" on public.meals for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meals: delete" on public.meals for delete using  (auth.uid() = user_id);

create index if not exists meals_user_date_idx on public.meals (user_id, date desc);

-- ---------------------------------------------------------------------------
-- achievements: which badges a user has earned, and when
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  earned_at      date not null default current_date,
  primary key (user_id, achievement_id)
);

alter table public.achievements enable row level security;

create policy "own achievements: read"   on public.achievements for select using  (auth.uid() = user_id);
create policy "own achievements: insert" on public.achievements for insert with check (auth.uid() = user_id);
create policy "own achievements: delete" on public.achievements for delete using  (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- subscriptions: entitlement. DELIBERATELY read-only to the client.
-- If users could write this table they could grant themselves a paid plan
-- straight from the browser console. Only the service role (an Edge Function
-- handling a verified payment webhook) may write here.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text not null check (plan in ('monthly','annual')),
  status     text not null default 'trialing'
             check (status in ('trialing','active','past_due','canceled','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Read only. No insert/update/delete policy exists, so the client cannot write.
create policy "own subscription: read" on public.subscriptions for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists day_logs_touch on public.day_logs;
create trigger day_logs_touch before update on public.day_logs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Create the profile row automatically when a user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
