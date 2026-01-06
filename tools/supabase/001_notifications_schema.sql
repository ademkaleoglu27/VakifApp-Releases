-- 001_notifications_schema.sql

-- 1. Push Tokens Table
create table public.user_push_tokens (
    token text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    device_type text, -- 'android' | 'ios'
    updated_at timestamptz default now(),
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.user_push_tokens enable row level security;

-- Policies for Push Tokens
-- User can see their own tokens
create policy "Users can view own push tokens"
    on public.user_push_tokens for select
    using ( auth.uid() = user_id );

-- User can insert their own tokens (managed by code to ensure user_id matches)
create policy "Users can insert own push tokens"
    on public.user_push_tokens for insert
    with check ( auth.uid() = user_id );

-- User can update their own tokens
create policy "Users can update own push tokens"
    on public.user_push_tokens for update
    using ( auth.uid() = user_id );

-- User can delete their own tokens (e.g. logout)
create policy "Users can delete own push tokens"
    on public.user_push_tokens for delete
    using ( auth.uid() = user_id );


-- 2. Notifications Table
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    body text not null,
    data jsonb, -- Extra data like deep links or type
    is_read boolean default false,
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies for Notifications
-- Users can view their own notifications
create policy "Users can view own notifications"
    on public.notifications for select
    using ( auth.uid() = user_id );

-- Users can update 'is_read' on their own notifications
create policy "Users can update own notifications"
    on public.notifications for update
    using ( auth.uid() = user_id );

-- DENY INSERT from Client for Notifications
-- (Default is deny if no policy exists, but we want to be explicit or just rely on default deny for insert)
-- We will NOT add an insert policy for authenticated users.
-- Only Service Role (Edge Functions) can insert.

-- Index for faster queries
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_created_at on public.notifications(created_at desc);
