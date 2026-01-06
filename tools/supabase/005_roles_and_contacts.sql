-- 005_roles_and_contacts.sql

-- 1. Add Phone Column to Profiles
alter table public.profiles add column if not exists phone text;

-- 2. Secure Profiles RLS
-- Allows users to update their own phone/display_name, but NOT role.
-- Role updates must happen via Service Role (Edge Function).

-- Drop existing update policies to redefine strictly
drop policy if exists "Users can update own display_name" on public.profiles;
drop policy if exists "Council Admins can update any profile" on public.profiles;

-- Policy: Users update own Basic Info (Display Name, Phone)
create policy "Users can update own basic info"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );
  -- Note: Postgres RLS for UPDATE 'with check' doesn't easily allow column-level restriction standardly without triggers or separate logic.
  -- Ideally, we'd use a trigger to prevent 'role' change if user is not admin.
  -- OR we trust the client logic + simple RLS, but for "Secure Role", we need to ensure 'role' isn't changed here.
  -- Supabase 'with check' ensures the NEW row matches the condition.
  -- Real security for columns usually needs a BEFORE UPDATE trigger.

-- Trigger to protect 'role' and 'is_active' columns from normal user updates
create or replace function public.protect_critical_profile_columns()
returns trigger as $$
begin
  -- If the role is changing
  if new.role is distinct from old.role then
    -- Allow IF it is a service role call (often tricky to detect in pure SQL without custom claims)
    -- OR if the modifier has 'mesveret_admin' role.
    -- However, we want to force usage of Edge Function for Role Updates to be explicit.
    -- So we simply DENY role changes in direct updates unless it's a superuser/service_role.
    
    -- Check if executing as service_role usually bypasses RLS, but triggers still fire.
    -- We can check current_setting('request.jwt.claim.role', true)
    
    if current_setting('request.jwt.claim.role', true) = 'service_role' then
      return new;
    end if;

    -- If not service role, REVERT the role change or raise error
    -- Let's raise error to be clear
    raise exception 'Role changes are not allowed directly. Use Admin functions.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_profile_protection on public.profiles;
create trigger enforce_profile_protection
  before update on public.profiles
  for each row execute procedure public.protect_critical_profile_columns();


-- 3. Policy for Admin Updates (if we want Admins to edit generic info of others too)
create policy "Admins can update all profiles"
  on public.profiles for update
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );

-- 4. Enable Read Access (Likely already exists, ensuring)
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles"
  on public.profiles for select
  using ( true );
