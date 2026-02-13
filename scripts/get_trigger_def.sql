-- Get the definition of handle_new_user
select pg_get_functiondef('public.handle_new_user'::regproc);
