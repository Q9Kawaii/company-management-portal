-- supabase/migrations/004_create_timelines.sql
--
-- Each project has a 'Main' timeline (whole team) and a 'Staff' timeline
-- (Admin/HR only). Both are created automatically by a trigger (see 009).
-- Entries with a parent_id are replies.

CREATE TABLE IF NOT EXISTS public.timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id) ON DELETE CASCADE,

    timeline_type TEXT NOT NULL
        CHECK (timeline_type IN ('Main', 'Staff')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (project_id, timeline_type)
);

ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS public.timeline_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id) ON DELETE CASCADE,

    timeline_id UUID NOT NULL
        REFERENCES public.timelines(id) ON DELETE CASCADE,

    parent_id UUID
        REFERENCES public.timeline_entries(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    content TEXT NOT NULL
        CHECK (LENGTH(TRIM(content)) > 0),

    -- Copied from the timeline so RLS can check it without a join.
    timeline_type TEXT NOT NULL
        CHECK (timeline_type IN ('Main', 'Staff')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_timeline_entries_timeline
    ON public.timeline_entries(timeline_id, created_at);

CREATE INDEX IF NOT EXISTS idx_timeline_entries_parent
    ON public.timeline_entries(parent_id);

DROP TRIGGER IF EXISTS timeline_entries_set_updated_at
    ON public.timeline_entries;

CREATE TRIGGER timeline_entries_set_updated_at
BEFORE UPDATE ON public.timeline_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
