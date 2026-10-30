-- supabase/seed.sql
-- Seeds the initial user ID counters.
-- Create the first Admin account through Supabase Authentication,
-- then insert its matching profile using the authenticated user's UUID.

INSERT INTO public.user_id_counters (role_prefix, last_value)
VALUES
    ('ADM', 0),
    ('HR', 0),
    ('EMP', 0),
    ('INT', 0)
ON CONFLICT (role_prefix) DO NOTHING;

-- Example: Create the first Admin profile after creating the
-- corresponding user in Supabase Authentication.
--
-- Replace the UUID and email below with the actual Auth user's details.
-- Uncomment and edit this block before running it.
--
-- INSERT INTO public.profiles (
--     id,
--     user_code,
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