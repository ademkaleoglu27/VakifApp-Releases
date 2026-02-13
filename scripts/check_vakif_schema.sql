-- CHECK VAKIFLAR SCHEMA
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'vakiflar' AND table_schema = 'public';

-- Check constraints (like UNIQUE on code)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.vakiflar'::regclass;
