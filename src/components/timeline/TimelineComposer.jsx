import { useRef, useState } from 'react';
import AttachmentUploader from './AttachmentUploader';

export default function TimelineComposer({
  onSubmit,
  loading = false,
  projectId,
  timelineId,
  timelineType = 'main',
  placeholder = 'Share an update with your team...',
  className = '',
}) {
  const textareaRef = useRef(null);

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');

  const normalizedTimelineType = String(timelineType || 'main').toLowerCase();

  const isStaffTimeline =
    normalizedTimelineType === 'staff' ||
    normalizedTimelineType === 'staff_timeline';

  const canSubmit =
    !loading && (content.trim().length > 0 || attachments.length > 0);

  const handleContentChange = (event) => {
    setContent(event.target.value);
    setError('');

    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) return;

    setError('');

    try {
      await onSubmit?.({
        content: content.trim(),
        text: content.trim(),
        attachments,
        projectId,
        timelineId,
        timelineType,
      });

      setContent('');
      setAttachments([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (submitError) {
      setError(submitError?.message || 'Unable to publish this update.');
    }
  };

  const handleAttachmentsUploaded = async (uploadedAttachments) => {
    const uploaded = Array.isArray(uploadedAttachments)
      ? uploadedAttachments
      : [uploadedAttachments];

    setAttachments((previous) => [...previous, ...uploaded]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-sm ${className}`}
    >
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Post an update
            </h3>

            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              {isStaffTimeline
                ? 'Share an internal staff update.'
                : 'Keep your project team informed.'}
            </p>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder={placeholder}
          rows={3}
          maxLength={5000}
          disabled={loading}
          className="min-h-28 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base leading-relaxed text-white transition-colors placeholder:text-slate-500 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm motion-reduce:transition-none"
        />

        <div className="mt-2 flex justify-end">
          <span
            className={`text-xs ${
              content.length >= 4800
                ? 'text-amber-300'
                : 'text-slate-400'
            }`}
          >
            {content.length}/5000
          </span>
        </div>

        {attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Attachments selected ({attachments.length})
            </p>

            {attachments.map((attachment, index) => (
              <div
                key={
                  attachment.id ||
                  attachment.path ||
                  attachment.name ||
                  index
                }
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-800/70 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14 2 6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 2v6h6"
                    />
                  </svg>

                  <span className="min-w-0 truncate text-sm text-slate-200">
                    {attachment.name ||
                      attachment.file_name ||
                      `Attachment ${index + 1}`}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setAttachments((previous) =>
                      previous.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm text-red-200"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-red-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01"
              />
            </svg>

            <span className="break-words">{error}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-700 bg-slate-950/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 flex-1">
          <AttachmentUploader
            projectId={projectId}
            timelineId={timelineId}
            entryId={null}
            disabled={loading}
            onUpload={handleAttachmentsUploaded}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto motion-reduce:transition-none"
        >
          {loading ? (
            <>
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
              Publishing...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"
                />
              </svg>
              Publish update
            </>
          )}
        </button>
      </div>
    </form>
  );
}