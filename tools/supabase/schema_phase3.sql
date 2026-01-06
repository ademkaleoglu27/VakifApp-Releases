-- Phase 3: Community Features Schema

-- 1. Hatims Table (Shared Hatim Events)
create table public.hatims (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Genel Hatim',
  target_date date,
  status text check (status in ('ACTIVE', 'COMPLETED')) default 'ACTIVE',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.hatims enable row level security;

-- 2. Hatim Parts (Juz Allocations)
create table public.hatim_parts (
  id uuid primary key default gen_random_uuid(),
  hatim_id uuid references public.hatims(id) on delete cascade,
  juz_number int not null check (juz_number between 1 and 30),
  status text check (status in ('AVAILABLE', 'TAKEN', 'COMPLETED')) default 'AVAILABLE',
  assigned_to_name text, -- Store name for display (snapshot)
  assigned_to_id uuid references auth.users(id), -- Nullable (if available)
  updated_at timestamptz default now()
);
alter table public.hatim_parts enable row level security;

-- 3. Reading Logs (Global Reading Tracking)
create table public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  book_id text not null, -- 'sozler', 'mektubat' etc.
  pages_read int default 0,
  duration_minutes int default 0,
  date timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.reading_logs enable row level security;

-- POLICIES

-- Hatims: Everyone can view active hatims
create policy "Authenticated can view hatims"
  on public.hatims for select
  using ( auth.role() = 'authenticated' );

-- Admins can manage hatims
create policy "Admins can manage hatims"
  on public.hatims for all
  using ( 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'council_admin')
  );

-- Hatim Parts: Everyone can view
create policy "Authenticated can view parts"
  on public.hatim_parts for select
  using ( auth.role() = 'authenticated' );

-- Hatim Parts: Everyone can update (Take a juz)
-- Ideally stricter checks: "can only update if status=AVAILABLE or assigned_to_id=me"
-- For simplicity in MVP, we allow update for authenticated, app logic handles race conditions via Optimistic UI + Sync
create policy "Authenticated can update parts"
  on public.hatim_parts for update
  using ( auth.role() = 'authenticated' );

-- Reading Logs: Everyone can view all (for leaderboards/totals)
create policy "Authenticated can view all logs"
  on public.reading_logs for select
  using ( auth.role() = 'authenticated' );

-- Reading Logs: Users can only insert/update their own
create policy "Users can insert own logs"
  on public.reading_logs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own logs"
  on public.reading_logs for update
  using ( auth.uid() = user_id );

-- INITIAL DATA SEED (Auto-create one active Hatim)
insert into public.hatims (title, status) values ('Vakıf Genel Hatim', 'ACTIVE');

-- Helper function to generate 30 parts for a hatim
create or replace function public.generate_hatim_parts()
returns trigger as $$
begin
  insert into public.hatim_parts (hatim_id, juz_number, status)
  select new.id, generate_series(1, 30), 'AVAILABLE';
  return new;
end;
$$ language plpgsql;

create trigger on_hatim_created
  after insert on public.hatims
  for each row execute procedure public.generate_hatim_parts();

-- Trigger the parts for the manually inserted hatim above (since trigger might miss if defined after)
-- We'll manually insert parts for the first one just in case the order of execution in SQL editor is tricky
do $$
declare
  h_id uuid;
begin
  select id into h_id from public.hatims limit 1;
  insert into public.hatim_parts (hatim_id, juz_number, status)
  select h_id, generate_series(1, 30), 'AVAILABLE'
  where not exists (select 1 from public.hatim_parts where hatim_id = h_id);
end $$;
