import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import AttachmentUploader from './AttachmentUploader';
import ConfirmDialog from '../common/ConfirmDialog';

function normalizeRole(role) {
  return String(role || '').toLowerCase();
}

function getAuthor(entry) {
  return (
    entry.author ||
    entry.user ||
    entry.profile ||
    entry.profiles ||
    entry.created_by_profile ||
    {}
  );
}

function getAuthorName(author) {
  return (
    author.name ||
    author.userId ||
    author.user_id ||
    'Unknown user'
  );
}

function getAuthorRole(author, entry) {
  return author.role || entry.author_role || entry.user_role || '';
}

function getEntryContent(entry) {
  return entry.content || entry.text || entry.message || '';
}

function getEntryDate(entry) {
  return (
    entry.created_at ||
    entry.createdAt ||
    entry.timestamp ||
    entry.updated_at ||
    null
  );
}

function getEntryAttachments(entry) {
  return entry.attachments || entry.timeline_attachments || [];
}

function getReplies(entry) {
  return entry.replies || entry.comments || [];
}

function Avatar({ author, name }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-indigo-400/30 bg-indigo-500/15 text-sm font-semibold text-indigo-200">
      {author.avatar_url || author.avatarUrl ? (
        <img
          src={author.avatar_url || author.avatarUrl}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials || '?'
      )}
    </div>
  );
}

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {attachments.map((attachment, index) => {
        const name =
          attachment.name ||
          attachment.file_name ||
          attachment.filename ||
          `Attachment ${index + 1}`;

        const url =
          attachment.url ||
          attachment.public_url ||
          attachment.signedUrl ||
          attachment.signed_url;

        const isImage =
          attachment.mime_type?.startsWith('image/') ||
          attachment.content_type?.startsWith('image/') ||
          /\.(png|jpe?g|gif|webp)$/i.test(name);

        return (
          <a
            key={attachment.id || attachment.path || url || `${name}-${index}`}
            href={url || undefined}
            target={url ? '_blank' : undefined}
            rel={url ? 'noopener noreferrer' : undefined}
            onClick={(event) => {
              if (!url) event.preventDefault();
            }}
            className={`flex min-w-0 items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3 transition-colors motion-reduce:transition-none ${
              url
                ? 'hover:border-indigo-400/40 hover:bg-indigo-500/10'
                : 'cursor-default'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-400">
              {isImage && url ? (
                <img
                  src={url}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
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
                    d="M14 2v6h6M8 13h8M8 17h5"
                  />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">
                {name}
              </p>

              {attachment.size != null && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatFileSize(attachment.size)}
                </p>
              )}
            </div>

            {url && (
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
                  d="M14 3h7v7m0-7L10 14"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                />
              </svg>
            )}
          </a>
        );
      })}
    </div>
  );
}

function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return '';

  const size = Number(bytes);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEntryDate(dateValue) {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return '';

  return `${formatDistanceToNow(date, { addSuffix: true })} · ${format(
    date,
    'dd MMM yyyy, h:mm a'
  )}`;
}

export default function TimelineEntry({
  entry,
  currentUser,
  canReply = true,
  canDelete = false,
  readOnly = false,
  onReply,
  onDelete,
  onUpload,
  loading = false,
  className = '',
}) {
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [replyError, setReplyError] = useState('');

  if (!entry) return null;

  const author = getAuthor(entry);
  const authorName = getAuthorName(author);
  const authorRole = getAuthorRole(author, entry);
  const content = getEntryContent(entry);
  const createdAt = getEntryDate(entry);
  const attachments = getEntryAttachments(entry);
  const replies = getReplies(entry);

  const entryId = entry.id || entry.entry_id;

  const currentUserId =
    currentUser?.id ||
    currentUser?.userId ||
    currentUser?.user_id ||
    '';

  const authorId =
    entry.user_id ||
    entry.author_id ||
    entry.created_by ||
    author.id ||
    author.user_id ||
    author.userId ||
    '';

  const isOwnEntry =
    Boolean(currentUserId) &&
    Boolean(authorId) &&
    String(currentUserId) === String(authorId);

  const isAdminOrHR = ['admin', 'hr'].includes(
    normalizeRole(currentUser?.role)
  );

  const canDeleteEntry = canDelete && (isOwnEntry || isAdminOrHR);

  const handleReplySubmit = async (event) => {
    event.preventDefault();

    const trimmedReply = replyText.trim();

    if (!trimmedReply || !onReply || replying || loading) return;

    setReplying(true);
    setReplyError('');

    try {
      await onReply({
        content: trimmedReply,
        text: trimmedReply,
      });

      setReplyText('');
      setShowReplyForm(false);
      setShowReplies(true);
    } catch (error) {
      setReplyError(error?.message || 'Unable to submit your reply.');
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete?.();
      setShowDeleteDialog(false);
    } catch {
      setShowDeleteDialog(false);
    }
  };

  return (
    <article
      className={`relative min-w-0 pl-12 ${className}`}
      aria-label={`Timeline update by ${authorName}`}
    >
      <div className="absolute left-0 top-1 z-10">
        <Avatar author={author} name={authorName} />
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/70 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="max-w-full break-words text-sm font-semibold text-white">
                {authorName}
              </h3>

              {authorRole && (
                <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium capitalize text-slate-300">
                  {String(authorRole).toLowerCase()}
                </span>
              )}

              {isOwnEntry && (
                <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200">
                  You
                </span>
              )}
            </div>

            {createdAt && (
              <p
                className="mt-1.5 text-xs leading-relaxed text-slate-400"
                title={new Date(createdAt).toLocaleString()}
              >
                {formatEntryDate(createdAt)}
              </p>
            )}
          </div>

          {canDeleteEntry && (
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
              aria-label="Delete timeline update"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
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
                  d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="px-4 py-4 sm:px-5">
          {content && (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
              {content}
            </p>
          )}

          <AttachmentList attachments={attachments} />

          {replies.length > 0 && (
            <div className="mt-5 border-t border-slate-700/70 pt-4">
              <button
                type="button"
                onClick={() => setShowReplies((previous) => !previous)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
                aria-expanded={showReplies}
              >
                <svg
                  className={`h-4 w-4 transition-transform motion-reduce:transition-none ${
                    showReplies ? 'rotate-90' : ''
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 18 6-6-6-6"
                  />
                </svg>

                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>

              {showReplies && (
                <div className="mt-4 space-y-4">
                  {replies.map((reply, index) => {
                    const replyAuthor =
                      reply.author ||
                      reply.user ||
                      reply.profile ||
                      reply.profiles ||
                      {};

                    const replyAuthorName = getAuthorName(replyAuthor);
                    const replyContent = getEntryContent(reply);
                    const replyDate = getEntryDate(reply);

                    return (
                      <div
                        key={
                          reply.id ||
                          reply.reply_id ||
                          `${entryId}-reply-${index}`
                        }
                        className="flex min-w-0 gap-3"
                      >
                        <Avatar
                          author={replyAuthor}
                          name={replyAuthorName}
                        />

                        <div className="min-w-0 flex-1 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="break-words text-sm font-semibold text-white">
                              {replyAuthorName}
                            </p>

                            {replyDate && (
                              <span className="text-xs leading-relaxed text-slate-400">
                                {formatEntryDate(replyDate)}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-200">
                            {replyContent}
                          </p>

                          <AttachmentList
                            attachments={getEntryAttachments(reply)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {canReply && !readOnly && (
            <div className="mt-4 border-t border-slate-700/70 pt-4">
              {!showReplyForm ? (
                <button
                  type="button"
                  onClick={() => setShowReplyForm(true)}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                >
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
                      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"
                    />
                  </svg>
                  Reply
                </button>
              ) : (
                <form onSubmit={handleReplySubmit} className="space-y-3">
                  <label
                    htmlFor={`reply-${entryId}`}
                    className="sr-only"
                  >
                    Write a reply
                  </label>

                  <textarea
                    id={`reply-${entryId}`}
                    value={replyText}
                    onChange={(event) => {
                      setReplyText(event.target.value);
                      setReplyError('');
                    }}
                    placeholder="Write a reply..."
                    rows={2}
                    maxLength={3000}
                    disabled={replying || loading}
                    autoFocus
                    className="min-h-20 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base leading-relaxed text-white transition-colors placeholder:text-slate-500 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm motion-reduce:transition-none"
                  />

                  {replyError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                    >
                      {replyError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyText('');
                        setReplyError('');
                      }}
                      disabled={replying}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!replyText.trim() || replying || loading}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                      {replying && (
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
                      {replying ? 'Sending...' : 'Send reply'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {typeof onUpload === 'function' && !readOnly && (
            <div className="mt-4 border-t border-slate-700/70 pt-4">
              <AttachmentUploader
                projectId={entry.project_id || entry.projectId}
                timelineId={entry.timeline_id || entry.timelineId}
                entryId={entryId}
                existingAttachments={attachments}
                disabled={loading || !canReply}
                onUpload={(files) => onUpload(files)}
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete timeline update"
        message="Are you sure you want to delete this update? This action cannot be undone."
        confirmText="Delete update"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        loading={loading}
      />
    </article>
  );
}