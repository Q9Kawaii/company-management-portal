-- supabase/migrations/002_create_projects.sql

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN ('Intern-Based', 'Main Project')
    ),
    description TEXT,

    status TEXT NOT NULL DEFAULT 'Draft' CHECK (
        status IN ('Draft', 'Published', 'In Progress', 'Completed', 'Archived')
    ),

    lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    published_at TIMESTAMPTZ,
    start_date DATE,
    end_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_projects_category
    ON public.projects(category);

CREATE INDEX IF NOT EXISTS idx_projects_status
    ON public.projects(status);

DROP TRIGGER IF EXISTS projects_set_updated_at
    ON public.projects;

CREATE TRIGGER projects_set_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
