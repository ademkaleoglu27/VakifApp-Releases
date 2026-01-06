-- Allow Admins to Delete Assignments
-- This is needed for manual cleanup of duties

create policy "Admins can delete assignments"
    on public.duty_assignments
    for delete
    using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'mesveret_admin') );
