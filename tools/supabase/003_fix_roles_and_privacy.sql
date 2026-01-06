-- 003_fix_roles_and_privacy.sql

-- 1. Fix Role Constraint
-- The existing schema uses 'council_admin' and 'member', but the app uses 'mesveret_admin' and 'sohbet_member'.
-- We need to update the check constraint to allow the new role names.

-- Drop the old constraint
alter table public.profiles drop constraint if exists profiles_role_check;

-- Add new constraint matching the TypeScript types
alter table public.profiles add constraint profiles_role_check 
    check (role in ('mesveret_admin', 'sohbet_member', 'accountant'));

-- MIGRATION OF EXISTING DATA (If necessary)
-- update public.profiles set role = 'mesveret_admin' where role = 'council_admin';
-- update public.profiles set role = 'sohbet_member' where role = 'member';


-- 2. SECURE TRANSACTIONS (CRITICAL)
-- User Requirement: "mesveret_admin muhasebede 'kim ne kadar verdi' VERİSİNİ ASLA GÖREMEZ."
-- Existing policy might allow admins. We must REMOVE it and ensure only 'accountant' has access.

-- Drop potential unsafe policies
drop policy if exists "Council Admins full access transactions" on public.transactions;
drop policy if exists "Admins can view transactions" on public.transactions;

-- Create strict Accountants-only policy
create policy "Accountants full access transactions"
    on public.transactions
    for all
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'accountant') );

-- (Optional) If users need to see their OWN transactions (e.g. donations they made), add:
-- create policy "Users can view own transactions"
--    on public.transactions
--    for select
--    using ( created_by = auth.uid() );
-- BUT requirement says "accountant privacy", usually this means only accountants see the ledger.
-- We will stick to strictly 'accountant' as requested for the 'transactions' table management.

-- 3. Verify other tables didn't use 'council_admin' in policies
-- Decisions table?
drop policy if exists "Council Admins full access decisions" on public.decisions;
create policy "Mesveret Admins full access decisions"
    on public.decisions
    for all
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );

-- Hatims?
drop policy if exists "Admins can manage hatims" on public.hatims;
create policy "Mesveret Admins can manage hatims"
    on public.hatims
    for all
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );
