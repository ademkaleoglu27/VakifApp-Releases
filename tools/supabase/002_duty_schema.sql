-- 002_duty_schema.sql

-- 1. Duty Types (e.g. Tea, Cleaning, Soup)
create table public.duty_types (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    default_points int default 10,
    created_at timestamptz default now()
);

alter table public.duty_types enable row level security;

-- Authenticated users can view duty types
create policy "Authenticated can view duty types"
    on public.duty_types for select
    using ( auth.role() = 'authenticated' );

-- Only admins can manage duty types
create policy "Admins can manage duty types"
    on public.duty_types for all
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );


-- 2. Rotation Pools (e.g. "Tuesday Tea Team")
create table public.rotation_pools (
    id uuid primary key default gen_random_uuid(),
    duty_type_id uuid references public.duty_types(id),
    name text not null,
    cron_schedule text, -- Optional: "0 9 * * 2"
    is_active boolean default true,
    created_at timestamptz default now()
);

alter table public.rotation_pools enable row level security;

-- Authenticated users can view pools
create policy "Authenticated can view pools"
    on public.rotation_pools for select
    using ( auth.role() = 'authenticated' );

-- Admins can manage pools
create policy "Admins can manage pools"
    on public.rotation_pools for all
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );


-- 3. Rotation Pool Members
create table public.rotation_pool_members (
    pool_id uuid references public.rotation_pools(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    last_assigned_at timestamptz,
    sort_order int default 0,
    primary key (pool_id, user_id)
);

alter table public.rotation_pool_members enable row level security;

-- Authenticated can view members
create policy "Authenticated can view pool members"
    on public.rotation_pool_members for select
    using ( auth.role() = 'authenticated' );

-- Admins can manage members
create policy "Admins can manage pool members"
    on public.rotation_pool_members for all
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );


-- 4. Duty Assignments (The actual instance)
create table public.duty_assignments (
    id uuid primary key default gen_random_uuid(),
    pool_id uuid references public.rotation_pools(id),
    user_id uuid references auth.users(id),
    date date not null,
    -- Status pipeline: PENDING -> CONFIRMED/DECLINED -> (if declined) REASSIGNED -> (if expired) EXP_PASSED
    status text check (status in ('PENDING', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'SKIPPED', 'COMPLETED')) default 'PENDING',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.duty_assignments enable row level security;

-- Users can view their own assignments
create policy "Users can view own assignments"
    on public.duty_assignments for select
    using ( auth.uid() = user_id );

-- Users can see assignments in pools they belong to (to see who is on duty)
create policy "Members can view pool assignments"
    on public.duty_assignments for select
    using ( 
        exists (
            select 1 from public.rotation_pool_members 
            where pool_id = public.duty_assignments.pool_id 
            and user_id = auth.uid()
        )
    );

-- Admins can view all
create policy "Admins can view all assignments"
    on public.duty_assignments for select
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );

-- Users update their own assignment?
-- NO. Use Edge Function `respond_assignment` to ensure logic (rotation etc.) runs safely.
-- Status changes are complex side-effects (push notifications, finding next person).
-- So NO UPDATE policy for general users.

-- 5. Helper Function for Updating Timestamp
create or replace function public.handle_updated_at() 
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_duty_assignment_update
  before update on public.duty_assignments
  for each row execute procedure public.handle_updated_at();
