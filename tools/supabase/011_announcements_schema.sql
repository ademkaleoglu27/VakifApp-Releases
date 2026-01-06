-- 011_announcements_schema.sql

-- 1. Announcements Table (Cloud)
create table if not exists public.announcements (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    priority text default 'normal', -- 'normal', 'high'
    location text,
    target_role text default 'all', -- 'all', 'mesveret_admin', 'sohbet_member' etc. (or mapped alias)
    created_by uuid references auth.users(id),
    created_at timestamptz default now()
);

-- 2. RLS Security
alter table public.announcements enable row level security;

-- Everyone can read
create policy "Anyone can read announcements"
on public.announcements for select
using (true);

-- Only Admins can create/delete
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
