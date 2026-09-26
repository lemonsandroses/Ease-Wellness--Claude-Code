-- Ease — calendar events and tasks
-- Run in Supabase Dashboard → SQL Editor after 0001_init.sql.

create table if not exists public.events (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'event' check (kind in ('event','task')),
  date        date not null,
  title       text not null,
  start_time  time,
  end_time    time,
  location    text,
  notes       text,
  done        boolean not null default false,
  -- Set for items pulled from Google Calendar, so re-syncing updates rather
  -- than duplicating. Unique per user, not globally.
  google_id   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "own events: read"   on public.events for select using  (auth.uid() = user_id);
create policy "own events: insert" on public.events for insert with check (auth.uid() = user_id);
create policy "own events: update" on public.events for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own events: delete" on public.events for delete using  (auth.uid() = user_id);

create index if not exists events_user_date_idx on public.events (user_id, date);
create unique index if not exists events_user_google_idx
  on public.events (user_id, google_id) where google_id is not null;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
