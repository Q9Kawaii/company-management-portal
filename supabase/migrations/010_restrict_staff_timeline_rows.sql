-- supabase/migrations/010_restrict_staff_timeline_rows.sql
--
-- Project members could see that a project's Staff timeline row existed
-- (though not its entries). Timeline rows now follow the same rule as their
-- entries: Admin/HR see both timelines, members see only Main.

DROP POLICY IF EXISTS timelines_select_policy ON public.timelines;

CREATE POLICY timelines_select_policy
ON public.timelines
FOR SELECT
TO authenticated
USING (
    public.can_access_timeline(id)
);
