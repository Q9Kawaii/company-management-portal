-- supabase/seed.sql
-- Seeds the user ID counters and shows how to create the first Admin.
--
-- Every other account is created from the portal through the create-user
-- Edge Function, which also creates the Supabase Auth user. The first
-- Admin has to be created by hand because no one can sign in yet.

INSERT INTO public.user_id_counters (role_prefix, last_value)
VALUES
    ('ADM', 0),
    ('HR', 0),
    ('EMP', 0),
    ('INT', 0)
ON CONFLICT (role_prefix) DO NOTHING;

-- 1. In the Supabase dashboard, open Authentication -> Users and create a
--    user with an email and password.
-- 2. Replace the UUID and email below with that user's details, uncomment
--    the block, and run it.
-- 3. Sign in to the portal with company ID ADM0001 and that password.
--
-- INSERT INTO public.profiles (
--     id,
--     user_id,
--     name,
--     email,
--     role,
--     department,
--     is_active
-- )
-- VALUES (
--     'REPLACE-WITH-AUTH-USER-UUID'::UUID,
--     'ADM0001',
--     'System Administrator',
--     'admin@example.com',
--     'Admin',
--     'Administration',
--     TRUE
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Keep the ADM counter in step with the ID used above.
-- UPDATE public.user_id_counters
-- SET last_value = GREATEST(last_value, 1)
-- WHERE role_prefix = 'ADM';
