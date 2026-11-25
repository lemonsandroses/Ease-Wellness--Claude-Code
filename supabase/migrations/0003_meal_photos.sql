-- Meal photos.
--
-- Two parts: a pointer on the meal row, and a private bucket to hold the file.
-- The image itself never goes in the database — Postgres is the wrong place for
-- binary blobs this size, and a bucket gives us signed URLs with an expiry for
-- free.

alter table public.meals
  add column if not exists photo_path text,
  -- Which produced the macros: the user picking a preset, or a vision estimate
  -- they accepted. Worth recording — an estimate and a deliberate entry are not
  -- equally trustworthy, and a later analysis should be able to tell them apart.
  add column if not exists source text
    check (source is null or source in ('manual', 'ai'));

-- Private bucket. `public => false` matters: these are photographs of a user's
-- meals, which is health data by context, and a public bucket would make every
-- object readable by anyone who can guess the path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  false,
  8388608, -- 8 MB; the client downscales well below this before upload
  array['image/jpeg', 'image/png', 'image/webp']
)
-- Correct the settings rather than skipping them, so a bucket someone created
-- by hand in the dashboard — where the default is public — is forced private on
-- the next run. `do nothing` would silently leave every meal photo readable by
-- anyone who guessed the path.
on conflict (id) do update set
  public             = false,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Every object lives under a folder named for the owner's user id, and these
-- policies only ever match when that first path segment equals the caller's
-- uid. That is what keeps one person's photos out of another's reach.
drop policy if exists "own meal photos: read"   on storage.objects;
drop policy if exists "own meal photos: insert" on storage.objects;
drop policy if exists "own meal photos: update" on storage.objects;
drop policy if exists "own meal photos: delete" on storage.objects;

create policy "own meal photos: read" on storage.objects
  for select using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own meal photos: insert" on storage.objects
  for insert with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own meal photos: update" on storage.objects
  for update using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own meal photos: delete" on storage.objects
  for delete using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
