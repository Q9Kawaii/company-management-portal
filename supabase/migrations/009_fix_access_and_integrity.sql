-- supabase/migrations/009_fix_access_and_integrity.sql
--
-- Fixes found while auditing the app against the database:
--   1. Staff timeline entries and attachments were readable by every
--      project member; they are now Admin/HR only.
--   2. HR could update any active profile, including their own role
--      (privilege escalation), but could not deactivate or reactivate
--      employees and interns. HR is now limited to Employee/Intern rows.
--   3. Team members could not see each other's profiles.
--   4. Email/company ID could be edited on profiles, which broke sign-in.
--   5. Projects had no timelines, so posting to a timeline always failed.
--   6. profiles.assigned was maintained by hand in several pages and
--      drifted; it is now kept in sync by triggers.
--   7. published_at / published_by were not set on every publish path.
--   8. The project-attachments storage bucket and its policies were missing.
--   9. Members could not delete their own timeline entries or attachments.
--  10. SECURITY DEFINER helpers were executable by anonymous users.
--  11. The ADM user ID counter was behind the existing ADM0001 account.


-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

-- Whether the current user may read a timeline: Admin/HR may read any;
-- project members may read only the project's Main timeline.
CREATE OR REPLACE FUNCTION public.can_access_timeline(target_timeline_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.is_active_user()
       AND EXISTS (
            SELECT 1
            FROM public.timelines AS t
            WHERE t.id = target_timeline_id
              AND (
                    public.can_manage_projects()
                    OR (
                        t.timeline_type = 'Main'
                        AND public.is_project_member(t.project_id)
                    )
              )
       );
$$;


-- Whether the current user shares a non-draft project with a profile.
CREATE OR REPLACE FUNCTION public.shares_project_with(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.project_members AS mine
        JOIN public.projects AS p
          ON p.id = mine.project_id
        WHERE mine.user_id = auth.uid()
          AND p.status <> 'Draft'
          AND (
                p.lead_id = target_profile_id
                OR EXISTS (
                    SELECT 1
                    FROM public.project_members AS theirs
                    WHERE theirs.project_id = mine.project_id
                      AND theirs.user_id = target_profile_id
                )
          )
    );
$$;


-- Extracts the timeline UUID from a storage path laid out as
-- <project_id>/<timeline_id>/<entry_id>/<file>. Returns NULL for any
-- malformed path instead of raising a cast error inside a policy.
CREATE OR REPLACE FUNCTION public.attachment_path_timeline_id(object_name TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN (storage.foldername(object_name))[2]
             ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(object_name))[2])::UUID
    END;
$$;


-- =========================================================
-- PROFILES
-- =========================================================

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;

CREATE POLICY profiles_select_policy
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR public.current_user_role() = 'Admin'
    OR (
        public.current_user_role() = 'HR'
        AND (is_active = TRUE OR role IN ('Employee', 'Intern'))
    )
    OR (
        is_active = TRUE
        AND public.is_active_user()
        AND public.shares_project_with(id)
    )
);


DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;

CREATE POLICY profiles_update_policy
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.current_user_role() = 'Admin'
    OR (
        public.current_user_role() = 'HR'
        AND role IN ('Employee', 'Intern')
    )
)
WITH CHECK (
    public.current_user_role() = 'Admin'
    OR (
        public.current_user_role() = 'HR'
        AND role IN ('Employee', 'Intern')
    )
);


-- Sign-in looks up the company ID and signs in with the profile email,
-- which must match the Supabase Auth account. Neither can be changed from
-- the client. `assigned` is owned by the sync triggers below, so client
-- writes to it are ignored.
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF current_setting('app.syncing_assignment', TRUE) = 'on' THEN
        RETURN NEW;
    END IF;

    IF auth.role() = 'authenticated' THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'The account ID and company ID cannot be changed.';
        END IF;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'The email address cannot be changed from the portal.';
        END IF;

        NEW.assigned := OLD.assigned;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;

CREATE TRIGGER profiles_guard_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_update();


-- =========================================================
-- ASSIGNMENT SYNC
-- A person is "assigned" while they lead or belong to a project that is
-- Draft, Published, or In Progress. Completed/Archived projects free them.
-- =========================================================

CREATE OR REPLACE FUNCTION public.sync_profile_assignment(profile_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF profile_ids IS NULL OR cardinality(profile_ids) = 0 THEN
        RETURN;
    END IF;

    PERFORM set_config('app.syncing_assignment', 'on', TRUE);

    UPDATE public.profiles AS pr
    SET assigned = computed.is_assigned
    FROM (
        SELECT
            target.id,
            (
                EXISTS (
                    SELECT 1
                    FROM public.project_members AS pm
                    JOIN public.projects AS p ON p.id = pm.project_id
                    WHERE pm.user_id = target.id
                      AND p.status IN ('Draft', 'Published', 'In Progress')
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.projects AS p
                    WHERE p.lead_id = target.id
                      AND p.status IN ('Draft', 'Published', 'In Progress')
                )
            ) AS is_assigned
        FROM public.profiles AS target
        WHERE target.id = ANY (profile_ids)
    ) AS computed
    WHERE pr.id = computed.id
      AND pr.assigned IS DISTINCT FROM computed.is_assigned;

    PERFORM set_config('app.syncing_assignment', 'off', TRUE);
END;
$$;


CREATE OR REPLACE FUNCTION public.on_project_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.sync_profile_assignment(ARRAY[OLD.user_id]);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.sync_profile_assignment(ARRAY[OLD.user_id, NEW.user_id]);
    ELSE
        PERFORM public.sync_profile_assignment(ARRAY[NEW.user_id]);
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS project_members_sync_assignment ON public.project_members;

CREATE TRIGGER project_members_sync_assignment
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.on_project_member_change();


CREATE OR REPLACE FUNCTION public.on_project_assignment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    affected UUID[];
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Members are handled by the cascaded project_members deletes.
        PERFORM public.sync_profile_assignment(ARRAY[OLD.lead_id]);
        RETURN NULL;
    END IF;

    SELECT array_agg(pm.user_id)
    INTO affected
    FROM public.project_members AS pm
    WHERE pm.project_id = NEW.id;

    PERFORM public.sync_profile_assignment(
        COALESCE(affected, '{}') || ARRAY[OLD.lead_id, NEW.lead_id]
    );

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS projects_sync_assignment ON public.projects;

CREATE TRIGGER projects_sync_assignment
AFTER UPDATE OF status, lead_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.on_project_assignment_change();

DROP TRIGGER IF EXISTS projects_sync_assignment_on_delete ON public.projects;

CREATE TRIGGER projects_sync_assignment_on_delete
AFTER DELETE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.on_project_assignment_change();


-- =========================================================
-- PUBLISH METADATA
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_project_publish_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'Published'
       AND OLD.status IS DISTINCT FROM 'Published' THEN
        NEW.published_at := COALESCE(NEW.published_at, NOW());
        NEW.published_by := COALESCE(NEW.published_by, auth.uid());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_set_publish_metadata ON public.projects;

CREATE TRIGGER projects_set_publish_metadata
BEFORE UPDATE OF status ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_project_publish_metadata();


-- =========================================================
-- TIMELINES
-- Every project gets a Main and a Staff timeline when it is created.
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_project_timelines()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.timelines (project_id, timeline_type)
    VALUES (NEW.id, 'Main'), (NEW.id, 'Staff')
    ON CONFLICT (project_id, timeline_type) DO NOTHING;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS projects_create_timelines ON public.projects;

CREATE TRIGGER projects_create_timelines
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.create_project_timelines();

-- Backfill timelines for projects created before this migration.
INSERT INTO public.timelines (project_id, timeline_type)
SELECT p.id, t.timeline_type
FROM public.projects AS p
CROSS JOIN (VALUES ('Main'), ('Staff')) AS t (timeline_type)
ON CONFLICT (project_id, timeline_type) DO NOTHING;


-- =========================================================
-- TIMELINE ENTRIES
-- =========================================================

DROP POLICY IF EXISTS timeline_entries_select_policy ON public.timeline_entries;

CREATE POLICY timeline_entries_select_policy
ON public.timeline_entries
FOR SELECT
TO authenticated
USING (
    public.can_access_timeline(timeline_id)
);


DROP POLICY IF EXISTS timeline_entries_insert_policy ON public.timeline_entries;

CREATE POLICY timeline_entries_insert_policy
ON public.timeline_entries
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_active_user()
    AND user_id = auth.uid()
    -- The entry's project and type must match its timeline.
    AND EXISTS (
        SELECT 1
        FROM public.timelines AS t
        WHERE t.id = timeline_id
          AND t.project_id = timeline_entries.project_id
          AND t.timeline_type = timeline_entries.timeline_type
    )
    -- A reply must stay on its parent's timeline.
    AND (
        parent_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.timeline_entries AS parent
            WHERE parent.id = timeline_entries.parent_id
              AND parent.timeline_id = timeline_entries.timeline_id
        )
    )
    AND (
        (
            timeline_type = 'Main'
            AND (
                public.can_manage_projects()
                OR public.is_project_member(project_id)
            )
        )
        OR (
            timeline_type = 'Staff'
            AND public.can_manage_projects()
        )
    )
);


DROP POLICY IF EXISTS timeline_entries_delete_policy ON public.timeline_entries;

CREATE POLICY timeline_entries_delete_policy
ON public.timeline_entries
FOR DELETE
TO authenticated
USING (
    public.can_manage_projects()
    OR (
        user_id = auth.uid()
        AND public.can_access_timeline(timeline_id)
    )
);


-- =========================================================
-- ATTACHMENTS
-- =========================================================

DROP POLICY IF EXISTS attachments_select_policy ON public.attachments;

CREATE POLICY attachments_select_policy
ON public.attachments
FOR SELECT
TO authenticated
USING (
    public.can_access_timeline(timeline_id)
);


DROP POLICY IF EXISTS attachments_delete_policy ON public.attachments;

CREATE POLICY attachments_delete_policy
ON public.attachments
FOR DELETE
TO authenticated
USING (
    public.can_manage_projects()
    OR uploaded_by = auth.uid()
);


-- =========================================================
-- STORAGE
-- Private bucket; access mirrors timeline access, using the timeline ID
-- embedded in each object's path.
-- =========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-attachments',
    'project-attachments',
    FALSE,
    10485760,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip'
    ]
)
ON CONFLICT (id) DO NOTHING;


DROP POLICY IF EXISTS project_attachments_select ON storage.objects;

CREATE POLICY project_attachments_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'project-attachments'
    AND public.can_access_timeline(public.attachment_path_timeline_id(name))
);


DROP POLICY IF EXISTS project_attachments_insert ON storage.objects;

CREATE POLICY project_attachments_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'project-attachments'
    AND public.can_access_timeline(public.attachment_path_timeline_id(name))
);


DROP POLICY IF EXISTS project_attachments_delete ON storage.objects;

CREATE POLICY project_attachments_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'project-attachments'
    AND (
        public.can_manage_projects()
        OR owner_id = (SELECT auth.uid())::TEXT
    )
);


-- =========================================================
-- FUNCTION PERMISSIONS
-- Helpers are needed by RLS policies for signed-in users only.
-- Trigger and sync functions are not callable through the API at all.
-- =========================================================

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_project_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_projects() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_timeline(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_project_with(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.attachment_path_timeline_id(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_timeline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_project_with(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attachment_path_timeline_id(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_profile_assignment(UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_project_member_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_project_assignment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_project_timelines() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_project_publish_metadata() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_user_code(TEXT) FROM PUBLIC, anon, authenticated;


-- =========================================================
-- DATA FIXES
-- =========================================================

-- Bring each ID counter up to the highest company ID already in use, so
-- the next generated ID can't collide with an existing account.
UPDATE public.user_id_counters AS c
SET last_value = GREATEST(c.last_value, existing.max_value)
FROM (
    SELECT
        prefix.role_prefix,
        COALESCE(
            MAX(SUBSTRING(p.user_id FROM LENGTH(prefix.role_prefix) + 1)::BIGINT),
            0
        ) AS max_value
    FROM public.user_id_counters AS prefix
    LEFT JOIN public.profiles AS p
      ON p.user_id ~ ('^' || prefix.role_prefix || '[0-9]+$')
    GROUP BY prefix.role_prefix
) AS existing
WHERE c.role_prefix = existing.role_prefix;

-- Recalculate every profile's assignment flag once.
SELECT public.sync_profile_assignment(ARRAY(SELECT id FROM public.profiles));
