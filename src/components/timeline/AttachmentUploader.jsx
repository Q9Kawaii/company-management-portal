import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadAttachment } from '../../services/storageService';

const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 5;

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ACCEPTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.docx',
  '.xlsx',
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  return 'file';
}

function FileIcon({ type, className = 'h-5 w-5' }) {
  if (type === 'image') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 15-5-5L5 21"
        />
      </svg>
    );
  }

  if (type === 'pdf') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 2v6h6M8 15h2a1.5 1.5 0 0 0 0-3H8v6m6-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1z"
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 2v6h6M8 13h8M8 17h8"
      />
    </svg>
  );
}

export default function AttachmentUploader({
  projectId,
  timelineId,
  entryId,
  onUpload,
  onRemove,
  existingAttachments = [],
  disabled = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  multiple = true,
  className = '',
}) {
  const inputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const availableSlots = Math.max(
    0,
    maxFiles - existingAttachments.length - selectedFiles.length
  );

  const validateFiles = (incomingFiles) => {
    const validFiles = [];
    const errors = [];

    const remainingSlots = Math.max(
      0,
      maxFiles - existingAttachments.length - selectedFiles.length
    );

    if (remainingSlots === 0) {
      setError(`You can attach a maximum of ${maxFiles} files.`);
      return [];
    }

    incomingFiles.slice(0, remainingSlots).forEach((file) => {
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const acceptedType =
        ACCEPTED_TYPES.includes(file.type) ||
        ACCEPTED_EXTENSIONS.includes(extension);

      if (!acceptedType) {
        errors.push(`${file.name}: File type not supported.`);
        return;
      }

      if (file.size > maxSizeBytes) {
        errors.push(`${file.name}: Maximum file size is ${maxSizeMB} MB.`);
        return;
      }

      const duplicate = [
        ...existingAttachments.map(
          (attachment) => attachment.name || attachment.file_name
        ),
        ...selectedFiles.map((item) => item.file.name),
        ...validFiles.map((item) => item.name),
      ].includes(file.name);

      if (duplicate) {
        errors.push(`${file.name}: This file has already been selected.`);
        return;
      }

      validFiles.push(file);
    });

    if (incomingFiles.length > remainingSlots) {
      errors.push(`Only ${remainingSlots} additional file(s) can be selected.`);
    }

    setError(errors.join(' '));
    return validFiles;
  };

  const handleFilesSelected = (fileList) => {
    if (disabled || uploading || !fileList?.length) return;

    const files = Array.from(fileList);
    const validFiles = validateFiles(files);

    if (validFiles.length > 0) {
      setSelectedFiles((previous) => [
        ...previous,
        ...validFiles.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
        })),
      ]);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeSelectedFile = (fileId) => {
    if (uploading || disabled) return;

    setSelectedFiles((previous) =>
      previous.filter((item) => item.id !== fileId)
    );

    setError('');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (disabled || uploading) return;

    handleFilesSelected(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (
      disabled ||
      uploading ||
      selectedFiles.length === 0 ||
      !projectId ||
      !timelineId ||
      !entryId
    ) {
      if (!projectId || !timelineId || !entryId) {
        setError('Project, timeline, and entry IDs are required.');
      }
      return;
    }

    setUploading(true);
    setError('');

    const uploadedAttachments = [];
    const failedFiles = [];

    try {
      for (const item of selectedFiles) {
        setProgress((previous) => ({
          ...previous,
          [item.id]: 'uploading',
        }));

        try {
          const result = await uploadAttachment({
            file: item.file,
            projectId,
            timelineId,
            entryId,
          });

          uploadedAttachments.push(result);

          setProgress((previous) => ({
            ...previous,
            [item.id]: 'complete',
          }));
        } catch (uploadError) {
          failedFiles.push({
            item,
            message: uploadError?.message || 'Upload failed.',
          });

          setProgress((previous) => ({
            ...previous,
            [item.id]: 'failed',
          }));
        }
      }

      if (uploadedAttachments.length > 0) {
        await onUpload?.(uploadedAttachments);
      }

      if (failedFiles.length > 0) {
        setError(
          failedFiles
            .map(({ item, message }) => `${item.file.name}: ${message}`)
            .join(' ')
        );

        setSelectedFiles(failedFiles.map(({ item }) => item));
      } else {
        setSelectedFiles([]);
        setProgress({});
      }
    } catch (uploadError) {
      setError(uploadError?.message || 'Unable to upload attachments.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveExisting = async (attachment) => {
    if (disabled || uploading || !onRemove) return;

    try {
      setError('');
      await onRemove(attachment);
    } catch (removeError) {
      setError(removeError?.message || 'Unable to remove attachment.');
    }
  };

  return (
    <div className={`min-w-0 space-y-4 ${className}`}>
      {/* File drop zone */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors sm:p-7 ${
          dragging
            ? 'border-indigo-400 bg-indigo-500/15'
            : 'border-slate-700 bg-slate-900/70 hover:border-indigo-400/60 hover:bg-slate-900'
        } ${
          disabled || uploading
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-default'
        } motion-reduce:transition-none`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={ACCEPTED_EXTENSIONS.join(',')}
          disabled={disabled || uploading || availableSlots === 0}
          onChange={(event) => handleFilesSelected(event.target.files)}
          className="hidden"
          aria-label="Choose attachments"
        />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
            />
          </svg>
        </div>

        <p className="mt-4 break-words text-sm font-semibold text-white">
          Drag and drop files here
        </p>

        <p className="mt-1 text-sm text-slate-300">
          or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading || availableSlots === 0}
            className="inline-flex min-h-11 items-center rounded-lg px-1 font-semibold text-indigo-300 underline decoration-indigo-400/50 underline-offset-4 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            browse files
          </button>
        </p>

        <p className="mt-2 break-words text-xs leading-5 text-slate-400">
          Images, PDF, TXT, DOCX, XLSX · Max {maxSizeMB} MB per file ·{' '}
          {Math.max(0, maxFiles - existingAttachments.length)} file slot(s)
          remaining
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200"
        >
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01"
            />
          </svg>
          <p className="min-w-0 break-words">{error}</p>
        </div>
      )}

      {/* Uploaded attachments */}
      {existingAttachments.length > 0 && (
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">
              Uploaded attachments
            </h4>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
              {existingAttachments.length} file(s)
            </span>
          </div>

          <div className="space-y-2">
            {existingAttachments.map((attachment, index) => {
              const name =
                attachment.name ||
                attachment.file_name ||
                `Attachment ${index + 1}`;

              return (
                <div
                  key={attachment.id || attachment.path || name}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300">
                    <FileIcon
                      type={
                        attachment.mime_type?.startsWith('image/')
                          ? 'image'
                          : attachment.mime_type === 'application/pdf'
                            ? 'pdf'
                            : 'file'
                      }
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    {attachment.url ? (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        {name}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-medium text-slate-200">
                        {name}
                      </p>
                    )}

                    {attachment.size != null && (
                      <p className="mt-1 text-xs text-slate-400">
                        {formatFileSize(attachment.size)}
                      </p>
                    )}
                  </div>

                  {onRemove && !disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(attachment)}
                      disabled={uploading}
                      aria-label={`Remove ${name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files ready to upload */}
      {selectedFiles.length > 0 && (
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">
              Files ready to upload ({selectedFiles.length})
            </h4>

            <button
              type="button"
              onClick={() => {
                if (!uploading) {
                  setSelectedFiles([]);
                  setProgress({});
                  setError('');
                }
              }}
              disabled={disabled || uploading}
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              Clear selection
            </button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map(({ id, file }) => (
              <div
                key={id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
                  <FileIcon type={getFileIcon(file)} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatFileSize(file.size)}
                  </p>

                  {progress[id] === 'uploading' && (
                    <p className="mt-1 text-xs font-medium text-indigo-300">
                      Uploading...
                    </p>
                  )}

                  {progress[id] === 'complete' && (
                    <p className="mt-1 text-xs font-medium text-emerald-300">
                      Uploaded successfully
                    </p>
                  )}

                  {progress[id] === 'failed' && (
                    <p className="mt-1 text-xs font-medium text-red-300">
                      Upload failed
                    </p>
                  )}
                </div>

                {!uploading && (
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(id)}
                    disabled={disabled}
                    aria-label={`Remove ${file.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6l12 12M18 6 6 18"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={disabled || uploading || selectedFiles.length === 0}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {uploading && (
              <svg
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}

            {uploading
              ? 'Uploading files...'
              : `Upload ${selectedFiles.length} file(s)`}
          </button>
        </div>
      )}
    </div>
  );
}