import { supabase } from '../lib/supabase';

const STORAGE_BUCKET = 'project-attachments';
const MAX_FILE_SIZE_MB = 10;

const ALLOWED_MIME_TYPES = [
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
  'application/zip',
];

// Replace characters that are unsafe in storage keys. Keeps the last 150
// characters (not the first) so the file extension is never cut off.
const sanitizeFileName = (fileName) =>
  fileName
    .normalize('NFKD')
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(-150);

const validateFile = (
  file,
  { maxSizeMB = MAX_FILE_SIZE_MB, allowedMimeTypes = ALLOWED_MIME_TYPES } = {}
) => {
  if (!(file instanceof File)) {
    throw new Error('Please select a valid file.');
  }

  if (file.size === 0) {
    throw new Error('Empty files cannot be uploaded.');
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File size must not exceed ${maxSizeMB} MB.`);
  }

  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error('This file type is not supported.');
  }
};

/**
 * Upload an attachment associated with a project timeline entry.
 *
 * Expected arguments:
 * {
 *   file,
 *   projectId,
 *   timelineId,
 *   entryId,
 *   maxSizeMB
 * }
 */
export async function uploadAttachment({
  file,
  projectId,
  timelineId,
  entryId,
  maxSizeMB = MAX_FILE_SIZE_MB,
}) {
  if (!projectId || !timelineId || !entryId) {
    throw new Error(
      'Project, timeline, and timeline entry IDs are required to upload an attachment.'
    );
  }

  validateFile(file, { maxSizeMB });

  // Path layout: <project>/<timeline>/<entry>/<uuid>-<name>. The UUID prefix
  // stops two uploads with the same file name from colliding.
  const safeName = sanitizeFileName(file.name);
  const uniqueName = `${crypto.randomUUID()}-${safeName}`;
  const storagePath = `${projectId}/${timelineId}/${entryId}/${uniqueName}`;

  const { data: uploadedFile, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Attachment upload failed:', uploadError);
    throw new Error('Unable to upload the attachment. Please try again.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    await supabase.storage.from(STORAGE_BUCKET).remove([uploadedFile.path]);
    throw new Error('You must be signed in to upload attachments.');
  }

  const { data: attachment, error: databaseError } = await supabase
    .from('attachments')
    .insert({
      project_id: projectId,
      timeline_id: timelineId,
      entry_id: entryId,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: uploadedFile.path,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
    })
    .select('*')
    .single();

  // Storage and the database can't share a transaction, so if the metadata
  // insert fails, delete the uploaded file to avoid leaving an orphan behind.
  if (databaseError) {
    console.error('Attachment metadata insert failed:', databaseError);

    const { error: cleanupError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([uploadedFile.path]);

    if (cleanupError) {
      console.error('Failed to clean up uploaded file:', cleanupError);
    }

    throw new Error('The file uploaded, but its attachment record could not be saved.');
  }

  return normalizeAttachment(attachment);
}

/**
 * Normalize attachment records returned by Supabase.
 */
export function normalizeAttachment(attachment) {
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
}

/**
 * Get a temporary signed URL for a private attachment.
 */
export async function getAttachmentUrl(filePath, expiresIn = 300) {
  if (!filePath) {
    throw new Error('A file path is required.');
  }

  // Clamp the link lifetime to between 1 minute and 1 hour.
  const safeExpiry = Math.min(Math.max(Number(expiresIn) || 300, 60), 3600);

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, safeExpiry);

  if (error) {
    console.error('Failed to create attachment URL:', error);
    throw new Error('Unable to access this attachment.');
  }

  return data.signedUrl;
}

/**
 * Fetch attachment metadata for a timeline entry.
 */
export async function getAttachments(entryId) {
  if (!entryId) {
    throw new Error('A timeline entry ID is required.');
  }

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch attachments:', error);
    throw new Error('Unable to load attachments.');
  }

  return (data || []).map(normalizeAttachment);
}

/**
 * Delete an attachment from storage and its metadata table.
 */
export async function deleteAttachment(attachment) {
  if (!attachment) {
    throw new Error('An attachment is required.');
  }

  const attachmentId =
    typeof attachment === 'string' ? attachment : attachment.id;

  if (!attachmentId) {
    throw new Error('An attachment ID is required.');
  }

  const { data: record, error: fetchError } = await supabase
    .from('attachments')
    .select('*')
    .eq('id', attachmentId)
    .single();

  if (fetchError) {
    console.error('Failed to find attachment:', fetchError);
    throw new Error('Unable to find the attachment.');
  }

  if (!record.file_path) {
    throw new Error('The attachment has no stored file path.');
  }

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([record.file_path]);

  if (storageError) {
    console.error('Failed to delete attachment file:', storageError);
    throw new Error('Unable to delete the attachment file.');
  }

  const { error: databaseError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (databaseError) {
    console.error('Failed to delete attachment metadata:', databaseError);
    throw new Error('The file was deleted, but its attachment record could not be removed.');
  }

  return true;
}

/**
 * Delete all attachments associated with a timeline entry.
 */
export async function deleteEntryAttachments(entryId) {
  if (!entryId) {
    throw new Error('A timeline entry ID is required.');
  }

  const attachments = await getAttachments(entryId);

  if (attachments.length === 0) {
    return true;
  }

  const paths = attachments.map((attachment) => attachment.file_path);

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(paths);

  if (storageError) {
    console.error('Failed to delete attachment files:', storageError);
    throw new Error('Unable to delete all attachment files.');
  }

  const { error: databaseError } = await supabase
    .from('attachments')
    .delete()
    .eq('entry_id', entryId);

  if (databaseError) {
    console.error('Failed to delete attachment records:', databaseError);
    throw new Error('Files were deleted, but attachment records could not be removed.');
  }

  return true;
}

/**
 * Download an attachment as a Blob.
 */
export async function downloadAttachment(filePath) {
  if (!filePath) {
    throw new Error('A file path is required.');
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(filePath);

  if (error) {
    console.error('Attachment download failed:', error);
    throw new Error('Unable to download this attachment.');
  }

  return data;
}

/**
 * Trigger a browser download for an attachment.
 */
export async function saveAttachmentToDevice(attachment) {
  if (!attachment?.file_path) {
    throw new Error('Valid attachment details are required.');
  }

  const blob = await downloadAttachment(attachment.file_path);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = attachment.file_name || 'attachment';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);

  return true;
}

/**
 * Check whether a file type is supported by the uploader.
 */
export function isAllowedAttachment(file) {
  return Boolean(
    file instanceof File &&
      file.size > 0 &&
      file.size <= MAX_FILE_SIZE_MB * 1024 * 1024 &&
      ALLOWED_MIME_TYPES.includes(file.type)
  );
}

/**
 * Format file sizes for display.
 */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Unknown size';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}