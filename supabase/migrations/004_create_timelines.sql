-- supabase/migrations/004_create_timelines.sql

CREATE TABLE IF NOT EXISTS public.timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id) ON DELETE CASCADE,

    timeline_type TEXT NOT NULL
        CHECK (timeline_type IN ('Main', 'Staff')),

    title TEXT NOT NULL,

    description TEXT NOT NULL DEFAULT '',

    created_by UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT timelines_unique_project_type
        UNIQUE (project_id, timeline_type)
);

ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_timelines_project_id
    ON public.timelines(project_id);

CREATE INDEX IF NOT EXISTS idx_timelines_timeline_type
    ON public.timelines(timeline_type);

DROP TRIGGER IF EXISTS timelines_set_updated_at
    ON public.timelines;

CREATE TRIGGER timelines_set_updated_at
BEFORE UPDATE ON public.timelines
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();