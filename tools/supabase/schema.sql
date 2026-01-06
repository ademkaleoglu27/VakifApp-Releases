-- Enable RLS on all tables
-- (Note: auth.users is already RLS enabled by default)

-- 1. Create Tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('council_admin', 'member', 'accountant')),
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  date date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.decisions enable row level security;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  currency text default 'TRY',
  category text not null,
  date date not null,
  description text,
  payment_method text check (payment_method in ('cash', 'bank_transfer', 'credit_card')) default 'cash',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.transactions enable row level security;

-- 2. Create Policies

-- Profiles Policies
create policy "Users can view all profiles"
  on public.profiles for select
  using ( true );

create policy "Users can update own display_name"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Council Admins can update any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'council_admin')
  );

-- Decisions Policies
-- (Default deny for members/accountants)
create policy "Council Admins full access decisions"
  on public.decisions
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'council_admin')
  );

-- Transactions Policies
-- (Default deny for members)
create policy "Council Admins full access transactions"
  on public.transactions
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'council_admin')
  );

create policy "Accountants full access transactions"
  on public.transactions
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant')
  );

-- 3. Triggers for New Users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'New Member'),
    'member'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
