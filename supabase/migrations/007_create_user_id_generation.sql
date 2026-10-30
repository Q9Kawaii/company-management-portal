-- supabase/migrations/007_create_user_id_generation.sql
--
-- Per-role counters for company IDs. Only the create-user Edge Function
-- (service role) calls generate_user_code(); clients cannot.

CREATE TABLE IF NOT EXISTS public.user_id_counters (
    role_prefix TEXT PRIMARY KEY
        CHECK (role_prefix IN ('ADM', 'HR', 'EMP', 'INT')),

    last_value BIGINT NOT NULL DEFAULT 0
        CHECK (last_value >= 0)
);

-- No policies on purpose: with RLS on and no policies, clients can
-- neither read nor write the counters.
ALTER TABLE public.user_id_counters ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_id_counters (role_prefix, last_value)
VALUES
    ('ADM', 0),
    ('HR', 0),
    ('EMP', 0),
    ('INT', 0)
ON CONFLICT (role_prefix) DO NOTHING;


CREATE OR REPLACE FUNCTION public.generate_user_code(role_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    prefix TEXT;
    next_value BIGINT;
BEGIN
    prefix := CASE LOWER(TRIM(role_name))
        WHEN 'admin' THEN 'ADM'
        WHEN 'hr' THEN 'HR'
        WHEN 'employee' THEN 'EMP'
        WHEN 'intern' THEN 'INT'
        ELSE NULL
    END;

    IF prefix IS NULL THEN
        RAISE EXCEPTION 'Invalid role for user ID generation';
    END IF;

    -- The upsert locks the counter row until the transaction ends, so
    -- concurrent calls get consecutive numbers and never the same one.
    INSERT INTO public.user_id_counters (role_prefix, last_value)
    VALUES (prefix, 1)
    ON CONFLICT (role_prefix)
    DO UPDATE SET last_value = public.user_id_counters.last_value + 1
    RETURNING last_value INTO next_value;

    RETURN prefix || LPAD(next_value::TEXT, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_user_code(TEXT) FROM PUBLIC, anon, authenticated;
