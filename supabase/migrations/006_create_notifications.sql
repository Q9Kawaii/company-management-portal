-- supabase/migrations/006_create_notifications.sql

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    message TEXT NOT NULL,

    type TEXT NOT NULL DEFAULT 'info'
        CHECK (type IN ('info', 'success', 'warning', 'error')),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON public.notifications(user_id, created_at DESC);
