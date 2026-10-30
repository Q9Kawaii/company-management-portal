-- supabase/migrations/005_create_attachments.sql
--
-- Metadata for files stored in the private `project-attachments` bucket
-- (created in 009). file_path is the object key:
-- <project_id>/<timeline_id>/<entry_id>/<uuid>-<file name>

CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id) ON DELETE CASCADE,

    timeline_id UUID NOT NULL
        REFERENCES public.timelines(id) ON DELETE CASCADE,

    entry_id UUID NOT NULL
        REFERENCES public.timeline_entries(id) ON DELETE CASCADE,

    uploaded_by UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT NOT NULL DEFAULT 0
        CHECK (file_size >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attachments_entry
    ON public.attachments(entry_id);
