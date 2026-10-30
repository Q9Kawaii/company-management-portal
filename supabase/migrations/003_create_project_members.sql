-- supabase/migrations/003_create_project_members.sql
--
-- Team assignments. The project lead is also stored here with role 'Lead'.

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'Member'
        CHECK (role IN ('Lead', 'Member')),

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_members_project
    ON public.project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user
    ON public.project_members(user_id);
