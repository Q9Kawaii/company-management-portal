import { supabase } from '../lib/supabase';

const TIMELINE_FIELDS = `
  id,
  project_id,
  timeline_id,
  parent_id,
  user_id,
  content,
  timeline_type,
  created_at,
  updated_at
`;

const ATTACHMENT_FIELDS = `
  id,
  project_id,
  timeline_id,
  entry_id,
  uploaded_by,
  file_name,
  file_path,
  file_type,
  file_size,
  created_at
`;

const normalizeAttachment = (attachment) => {
  if (!attachment) return null;

  return {
    ...attachment,
    projectId: attachment.project_id,
    timelineId: attachment.timeline_id,
    entryId: attachment.entry_id,
    uploadedBy: attachment.uploaded_by,
    fileName: attachment.file_name,
    filePath: attachment.file_path,
    fileType: attachment.file_type,
    fileSize: attachment.file_size,
    createdAt: attachment.created_at,
  };
};

const normalizeEntry = (entry) => {
  if (!entry) return null;

  const profile = entry.profiles || entry.profile || null;

  return {
    ...entry,
    projectId: entry.project_id,
    timelineId: entry.timeline_id,
    parentId: entry.parent_id,
    userId: entry.user_id,
    timelineType: entry.timeline_type,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    user: profile
      ? {
          ...profile,
          userId: profile.user_code || profile.user_id,
          isActive: profile.is_active !== false,
        }
      : null,
    attachments: (entry.attachments || []).map(normalizeAttachment),
    replies: (entry.replies || []).map(normalizeEntry),
  };
};

// Each project has two timelines: 'main' (whole team) and 'staff'
// (Admin/HR only). Callers pass either an explicit type or a timeline
// identifier such as 'staff_timeline'; anything unrecognised falls back
// to 'main', so an unknown value can never expose the staff timeline.
const getTimelineType = (timelineId, timelineType) => {
  const type = timelineType || timelineId || 'main';

  if (type === 'staff' || type === 'staff_timeline') {
    return 'staff';
  }

  return 'main';
};

/**
 * Fetch timeline entries for a project timeline.
 */
export async function getTimelineEntries(
  projectId,
  timelineId = 'main',
  options = {}
) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  const {
    limit = 100,
    before = null,
    timelineType = timelineId,
  } = options;

  const normalizedType = getTimelineType(timelineId, timelineType);

  let query = supabase
    .from('timeline_entries')
    .select(`
      ${TIMELINE_FIELDS},
      profiles:user_id (
        id,
        user_id,
        user_code,
        name,
        role,
        is_active
      ),
      attachments (
        ${ATTACHMENT_FIELDS}
      )
    `)
    .eq('project_id', projectId)
    .eq('timeline_id', timelineId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch timeline entries:', error);
    throw new Error('Unable to load timeline entries.');
  }

  const entries = (data || []).map(normalizeEntry);

  if (entries.length === 0) {
    return [];
  }

  // Replies are fetched in a second query for all top-level entries at once,
  // then grouped by parent, instead of querying once per entry.
  const entryIds = entries.map((entry) => entry.id);

  const { data: replies, error: repliesError } = await supabase
    .from('timeline_entries')
    .select(`
      ${TIMELINE_FIELDS},
      profiles:user_id (
        id,
        user_id,
        user_code,
        name,
        role,
        is_active
      ),
      attachments (
        ${ATTACHMENT_FIELDS}
      )
    `)
    .in('parent_id', entryIds)
    .order('created_at', { ascending: true });

  if (repliesError) {
    console.error('Failed to fetch timeline replies:', repliesError);
    throw new Error('Unable to load timeline replies.');
  }

  const normalizedReplies = (replies || []).map(normalizeEntry);
  const repliesByParent = new Map();

  normalizedReplies.forEach((reply) => {
    const parentId = reply.parentId;

    if (!repliesByParent.has(parentId)) {
      repliesByParent.set(parentId, []);
    }

    repliesByParent.get(parentId).push(reply);
  });

  return entries.map((entry) => ({
    ...entry,
    timelineType: entry.timelineType || normalizedType,
    replies: repliesByParent.get(entry.id) || [],
  }));
}

/**
 * Create a timeline entry.
 */
export async function createTimelineEntry({
  projectId,
  timelineId = 'main',
  timelineType = timelineId,
  content,
  text,
  attachments = [],
}) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  const entryContent = (content || text || '').trim();

  if (!entryContent && attachments.length === 0) {
    throw new Error('Write a message or attach a file before posting.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to post to the timeline.');
  }

  const normalizedType = getTimelineType(timelineId, timelineType);

  const { data: entry, error } = await supabase
    .from('timeline_entries')
    .insert({
      project_id: projectId,
      timeline_id: timelineId,
      parent_id: null,
      user_id: user.id,
      content: entryContent,
      timeline_type: normalizedType,
    })
    .select(`
      ${TIMELINE_FIELDS},
      profiles:user_id (
        id,
        user_id,
        user_code,
        name,
        role,
        is_active
      )
    `)
    .single();

  if (error) {
    console.error('Failed to create timeline entry:', error);
    throw new Error('Unable to post the timeline entry.');
  }

  // Attachments are linked to the entry after it is created, because the
  // storage path and the attachments row both need the new entry's ID.
  // Items that already have an `id` were uploaded earlier and are kept as-is;
  // raw File objects are uploaded now.
  const savedAttachments = [];

  for (const attachment of attachments) {
    if (attachment?.id) {
      savedAttachments.push(normalizeAttachment(attachment));
      continue;
    }

    if (attachment instanceof File) {
      const { uploadAttachment } = await import('./storageService');

      const uploaded = await uploadAttachment({
        file: attachment,
        projectId,
        timelineId,
        entryId: entry.id,
      });

      savedAttachments.push(uploaded);
    }
  }

  return {
    ...normalizeEntry(entry),
    attachments: savedAttachments,
    replies: [],
  };
}

/**
 * Reply to an existing timeline entry.
 */
export async function replyToTimelineEntry({
  entryId,
  parentId,
  projectId,
  timelineId = 'main',
  timelineType = timelineId,
  content,
  text,
  attachments = [],
}) {
  const resolvedParentId = parentId || entryId;
  const replyContent = (content || text || '').trim();

  if (!resolvedParentId || !projectId) {
    throw new Error('A project ID and parent timeline entry ID are required.');
  }

  if (!replyContent && attachments.length === 0) {
    throw new Error('Write a reply or attach a file before submitting.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to reply.');
  }

  const normalizedType = getTimelineType(timelineId, timelineType);

  const { data: reply, error } = await supabase
    .from('timeline_entries')
    .insert({
      project_id: projectId,
      timeline_id: timelineId,
      parent_id: resolvedParentId,
      user_id: user.id,
      content: replyContent,
      timeline_type: normalizedType,
    })
    .select(`
      ${TIMELINE_FIELDS},
      profiles:user_id (
        id,
        user_id,
        user_code,
        name,
        role,
        is_active
      )
    `)
    .single();

  if (error) {
    console.error('Failed to create timeline reply:', error);
    throw new Error('Unable to submit your reply.');
  }

  const savedAttachments = [];

  for (const attachment of attachments) {
    if (attachment?.id) {
      savedAttachments.push(normalizeAttachment(attachment));
      continue;
    }

    if (attachment instanceof File) {
      const { uploadAttachment } = await import('./storageService');

      const uploaded = await uploadAttachment({
        file: attachment,
        projectId,
        timelineId,
        entryId: reply.id,
      });

      savedAttachments.push(uploaded);
    }
  }

  return {
    ...normalizeEntry(reply),
    attachments: savedAttachments,
    replies: [],
  };
}

/**
 * Delete a timeline entry or reply.
 */
export async function deleteTimelineEntry(entryId) {
  if (!entryId) {
    throw new Error('A timeline entry ID is required.');
  }

  const { data: entry, error: fetchError } = await supabase
    .from('timeline_entries')
    .select('id, parent_id')
    .eq('id', entryId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to find timeline entry:', fetchError);
    throw new Error('Unable to find the timeline entry.');
  }

  if (!entry) {
    throw new Error('This timeline entry no longer exists.');
  }

  const { data: attachments, error: attachmentFetchError } = await supabase
    .from('attachments')
    .select('id, file_path')
    .eq('entry_id', entryId);

  if (attachmentFetchError) {
    console.error('Failed to fetch entry attachments:', attachmentFetchError);
    throw new Error('Unable to prepare the entry for deletion.');
  }

  // Remove stored files before deleting the rows that reference them.
  // Deleting the rows first would leave orphaned files in the bucket
  // with no record pointing at them.
  if (attachments?.length) {
    const paths = attachments
      .map((attachment) => attachment.file_path)
      .filter(Boolean);

    if (paths.length) {
      const { error: storageError } = await supabase.storage
        .from('project-attachments')
        .remove(paths);

      if (storageError) {
        console.error('Failed to delete timeline attachment files:', storageError);
        throw new Error('Unable to delete the timeline attachments.');
      }
    }

    const { error: metadataError } = await supabase
      .from('attachments')
      .delete()
      .eq('entry_id', entryId);

    if (metadataError) {
      console.error('Failed to delete attachment records:', metadataError);
      throw new Error('Unable to remove timeline attachment records.');
    }
  }

  const { error: deleteError } = await supabase
    .from('timeline_entries')
    .delete()
    .eq('id', entryId);

  if (deleteError) {
    console.error('Failed to delete timeline entry:', deleteError);
    throw new Error('Unable to delete the timeline entry.');
  }

  return true;
}

/**
 * Fetch all replies for a specific timeline entry.
 */
export async function getTimelineReplies(entryId) {
  if (!entryId) {
    throw new Error('A timeline entry ID is required.');
  }

  const { data, error } = await supabase
    .from('timeline_entries')
    .select(`
      ${TIMELINE_FIELDS},
      profiles:user_id (
        id,
        user_id,
        user_code,
        name,
        role,
        is_active
      ),
      attachments (
        ${ATTACHMENT_FIELDS}
      )
    `)
    .eq('parent_id', entryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch timeline replies:', error);
    throw new Error('Unable to load timeline replies.');
  }

  return (data || []).map(normalizeEntry);
}

/**
 * Subscribe to realtime timeline entry changes.
 * The caller should unsubscribe from the returned channel when finished.
 */
export function subscribeToTimeline(projectId, timelineId, callback) {
  if (!projectId || !timelineId || typeof callback !== 'function') {
    throw new Error('Project ID, timeline ID, and callback are required.');
  }

  return supabase
    .channel(`timeline:${projectId}:${timelineId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'timeline_entries',
        filter: `project_id=eq.${projectId}`,
      },
      // Realtime filters support only one column, so the channel listens to
      // the whole project and events from the other timeline are dropped here.
      (payload) => {
        const entry = payload.new?.id ? normalizeEntry(payload.new) : null;
        const oldEntry = payload.old?.id ? normalizeEntry(payload.old) : null;

        if (
          (entry && entry.timeline_id !== timelineId) ||
          (oldEntry && oldEntry.timeline_id !== timelineId)
        ) {
          return;
        }

        callback({
          eventType: payload.eventType,
          entry,
          old: oldEntry,
        });
      }
    )
    .subscribe();
}

/**
 * Unsubscribe from a realtime timeline channel.
 */
export async function unsubscribeFromTimeline(channel) {
  if (!channel) return;

  const { error } = await supabase.removeChannel(channel);

  if (error) {
    console.error('Failed to unsubscribe from timeline:', error);
  }
}