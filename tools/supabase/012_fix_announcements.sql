-- 012_fix_announcements.sql

-- WARNING: This will delete existing announcements to ensure schema is correct
drop table if exists public.announcements cascade;

-- 1. Announcements Table (Cloud) - Recreate
create table public.announcements (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    priority text default 'normal',
    location text,
    target_role text default 'all', 
    created_by uuid references auth.users(id),
    created_at timestamptz default now()
);

-- 2. RLS Security
alter table public.announcements enable row level security;

create policy "Anyone can read announcements"
on public.announcements for select
using (true);

create policy "Admins can insert announcements"
on public.announcements for insert
with check (
    exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'mesveret_admin'
    )
);

create policy "Admins can delete announcements"
on public.announcements for delete
using (
    exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role = 'mesveret_admin'
    )
);
