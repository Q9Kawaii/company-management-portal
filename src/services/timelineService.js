import { supabase } from '../lib/supabase';
import { uploadAttachment } from './storageService';

const STORAGE_BUCKET = 'project-attachments';

// How long signed attachment links stay valid while a timeline is open.
const ATTACHMENT_URL_TTL_SECONDS = 60 * 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// `profiles.user_id` holds the company ID (e.g. "EMP0003"); `id` is the UUID.
const AUTHOR_FIELDS = `
  profiles:user_id (
    id,
    user_id,
    name,
    role,
    is_active
  )
`;

const ENTRY_SELECT = `
  ${TIMELINE_FIELDS},
  ${AUTHOR_FIELDS},
  attachments (
    ${ATTACHMENT_FIELDS}
  )
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
          userId: profile.user_id,
          isActive: profile.is_active !== false,
        }
      : null,
    attachments: (entry.attachments || []).map(normalizeAttachment),
    replies: (entry.replies || []).map(normalizeEntry),
  };
};

// Each project has two timelines: 'Main' (whole team) and 'Staff'
// (Admin/HR only). Callers pass a key such as 'main', 'staff' or
// 'staff_timeline'; anything unrecognised falls back to 'Main', so an
// unknown value can never expose the staff timeline.
const getTimelineType = (timelineKey) => {
  const key = String(timelineKey || 'main').toLowerCase();

  return key === 'staff' || key === 'staff_timeline' ? 'Staff' : 'Main';
};

/**
 * Resolve a timeline key ('main' / 'staff') to the project's timeline row.
 * A UUID is accepted as-is so callers that already hold the ID can pass it.
 * Both timelines are created by a database trigger when a project is created.
 */
async function resolveTimeline(projectId, timelineKey) {
  if (UUID_RE.test(String(timelineKey || ''))) {
    const { data, error } = await supabase
      .from('timelines')
      .select('id, timeline_type')
      .eq('id', timelineKey)
      .maybeSingle();

    if (error || !data) {
      throw new Error('This timeline is not available.');
    }

    return data;
  }

  const timelineType = getTimelineType(timelineKey);

  const { data, error } = await supabase
    .from('timelines')
    .select('id, timeline_type')
    .eq('project_id', projectId)
    .eq('timeline_type', timelineType)
    .maybeSingle();

  if (error) {
    console.error('Failed to resolve timeline:', error);
    throw new Error('Unable to load this timeline.');
  }

  if (!data) {
    // RLS hides the Staff timeline from non-staff, which also lands here.
    throw new Error('This timeline is not available.');
  }

  return data;
}

/**
 * Attach a short-lived signed `url` to every attachment, in one request.
 * The bucket is private, so files can only be opened through these links.
 */
async function signAttachmentUrls(entries) {
  const attachments = entries.flatMap((entry) => [
    ...entry.attachments,
    ...(entry.replies || []).flatMap((reply) => reply.attachments),
  ]);

  const paths = [
    ...new Set(attachments.map((attachment) => attachment.file_path)),
  ].filter(Boolean);

  if (paths.length === 0) return;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(paths, ATTACHMENT_URL_TTL_SECONDS);

  if (error) {
    // Entries still render without links; only file access is affected.
    console.error('Failed to sign attachment URLs:', error);
    return;
  }

  const urlByPath = new Map(
    (data || [])
      .filter((item) => item.signedUrl)
      .map((item) => [item.path, item.signedUrl])
  );

  attachments.forEach((attachment) => {
    attachment.url = urlByPath.get(attachment.file_path) || null;
  });
}

/**
 * Upload any new File objects for an entry. Items that already have an `id`
 * were uploaded earlier and are kept as-is.
 */
async function saveEntryAttachments(attachments, { projectId, timelineId, entryId }) {
  const saved = [];

  for (const attachment of attachments) {
    if (attachment?.id) {
      saved.push(normalizeAttachment(attachment));
      continue;
    }

    if (attachment instanceof File) {
      saved.push(
        await uploadAttachment({
          file: attachment,
          projectId,
          timelineId,
          entryId,
        })
      );
    }
  }

  return saved;
}

// The database requires non-empty content, so attachment-only posts get a
// short description instead of an empty string.
const resolveContent = (content, attachments) => {
  const trimmed = (content || '').trim();

  if (trimmed) return trimmed;

  const count = attachments.length;
  return `Shared ${count} attachment${count === 1 ? '' : 's'}.`;
};

async function getSignedInUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('You must be signed in to post to the timeline.');
  }

  return user.id;
}

/**
 * Fetch top-level entries (newest first) with their replies and attachments.
 */
export async function getTimelineEntries(
  projectId,
  timelineKey = 'main',
  options = {}
) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  const { limit = 100, before = null } = options;
  const timeline = await resolveTimeline(projectId, timelineKey);

  let query = supabase
    .from('timeline_entries')
    .select(ENTRY_SELECT)
    .eq('timeline_id', timeline.id)
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
  const { data: replies, error: repliesError } = await supabase
    .from('timeline_entries')
    .select(ENTRY_SELECT)
    .in(
      'parent_id',
      entries.map((entry) => entry.id)
    )
    .order('created_at', { ascending: true });

  if (repliesError) {
    console.error('Failed to fetch timeline replies:', repliesError);
    throw new Error('Unable to load timeline replies.');
  }

  const repliesByParent = new Map();

  (replies || []).map(normalizeEntry).forEach((reply) => {
    if (!repliesByParent.has(reply.parentId)) {
      repliesByParent.set(reply.parentId, []);
    }

    repliesByParent.get(reply.parentId).push(reply);
  });

  const result = entries.map((entry) => ({
    ...entry,
    replies: repliesByParent.get(entry.id) || [],
  }));

  await signAttachmentUrls(result);

  return result;
}

async function insertEntry({
  projectId,
  timelineKey,
  parentId,
  content,
  text,
  attachments,
}) {
  if (!projectId) {
    throw new Error('A project ID is required.');
  }

  if (!(content || text || '').trim() && attachments.length === 0) {
    throw new Error('Write a message or attach a file before posting.');
  }

  const [userId, timeline] = await Promise.all([
    getSignedInUserId(),
    resolveTimeline(projectId, timelineKey),
  ]);

  const { data: entry, error } = await supabase
    .from('timeline_entries')
    .insert({
      project_id: projectId,
      timeline_id: timeline.id,
      parent_id: parentId,
      user_id: userId,
      content: resolveContent(content || text, attachments),
      timeline_type: timeline.timeline_type,
    })
    .select(`${TIMELINE_FIELDS}, ${AUTHOR_FIELDS}`)
    .single();

  if (error) {
    console.error('Failed to create timeline entry:', error);
    throw new Error(
      parentId
        ? 'Unable to submit your reply.'
        : 'Unable to post the timeline entry.'
    );
  }

  // Attachments are linked after the entry exists, because the storage path
  // and the attachments row both need the new entry's ID.
  const savedAttachments = await saveEntryAttachments(attachments, {
    projectId,
    timelineId: timeline.id,
    entryId: entry.id,
  });

  return {
    ...normalizeEntry(entry),
    attachments: savedAttachments,
    replies: [],
  };
}

/**
 * Create a top-level timeline entry. `attachments` may contain File objects,
 * which are uploaded once the entry has been created.
 */
export async function createTimelineEntry({
  projectId,
  timelineId = 'main',
  content,
  text,
  attachments = [],
}) {
  return insertEntry({
    projectId,
    timelineKey: timelineId,
    parentId: null,
    content,
    text,
    attachments,
  });
}

/**
 * Reply to an existing timeline entry.
 */
export async function replyToTimelineEntry({
  entryId,
  parentId,
  projectId,
  timelineId = 'main',
  content,
  text,
  attachments = [],
}) {
  const resolvedParentId = parentId || entryId;

  if (!resolvedParentId) {
    throw new Error('A parent timeline entry ID is required.');
  }

  return insertEntry({
    projectId,
    timelineKey: timelineId,
    parentId: resolvedParentId,
    content,
    text,
    attachments,
  });
}

/**
 * Delete a timeline entry or reply, including stored files for the entry
 * and for any replies under it.
 */
export async function deleteTimelineEntry(entryId) {
  if (!entryId) {
    throw new Error('A timeline entry ID is required.');
  }

  const { data: replies, error: repliesError } = await supabase
    .from('timeline_entries')
    .select('id')
    .eq('parent_id', entryId);

  if (repliesError) {
    console.error('Failed to find timeline replies:', repliesError);
    throw new Error('Unable to prepare the entry for deletion.');
  }

  const entryIds = [entryId, ...(replies || []).map((reply) => reply.id)];

  const { data: attachments, error: attachmentFetchError } = await supabase
    .from('attachments')
    .select('id, file_path')
    .in('entry_id', entryIds);

  if (attachmentFetchError) {
    console.error('Failed to fetch entry attachments:', attachmentFetchError);
    throw new Error('Unable to prepare the entry for deletion.');
  }

  // Remove stored files before deleting the rows that reference them.
  // Deleting the rows first would leave orphaned files in the bucket
  // with no record pointing at them.
  const paths = (attachments || [])
    .map((attachment) => attachment.file_path)
    .filter(Boolean);

  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (storageError) {
      console.error('Failed to delete timeline attachment files:', storageError);
      throw new Error('Unable to delete the timeline attachments.');
    }
  }

  // Attachment rows and replies are removed by ON DELETE CASCADE.
  const { data: deleted, error: deleteError } = await supabase
    .from('timeline_entries')
    .delete()
    .eq('id', entryId)
    .select('id');

  if (deleteError) {
    console.error('Failed to delete timeline entry:', deleteError);
    throw new Error('Unable to delete the timeline entry.');
  }

  // RLS filters rows the user may not delete instead of raising an error.
  if (!deleted?.length) {
    throw new Error('You do not have permission to delete this entry.');
  }

  return true;
}
