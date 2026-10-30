import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useNotifications } from './useNotifications';

import {
  getTimelineEntries,
  createTimelineEntry,
  replyToTimelineEntry,
  deleteTimelineEntry,
} from '../services/timelineService';

export default function useTimeline(projectId, timelineId) {
  const { user } = useAuth();
  const { error, success } = useNotifications();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!projectId || !timelineId) {
      setEntries([]);
      return [];
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await getTimelineEntries(projectId, timelineId);

      const fetchedEntries = Array.isArray(result)
        ? result
        : result?.data || [];

      setEntries(fetchedEntries);
      return fetchedEntries;
    } catch (err) {
      const message = err?.message || 'Failed to load timeline.';

      setErrorMessage(message);
      error(message);

      return [];
    } finally {
      setLoading(false);
    }
  }, [projectId, timelineId, error]);

  const createEntry = useCallback(
    async (payload) => {
      if (!user?.id) {
        return {
          success: false,
          error: 'You must be signed in.',
        };
      }

      if (!projectId || !timelineId) {
        return {
          success: false,
          error: 'A project and timeline are required.',
        };
      }

      setActionLoading(true);
      setErrorMessage('');

      try {
        const result = await createTimelineEntry({
          ...payload,
          projectId,
          timelineId,
        });

        const createdEntry = result?.data ?? result;

        if (!createdEntry) {
          throw new Error('The timeline entry could not be created.');
        }

        setEntries((previous) => [...previous, createdEntry]);

        success('Timeline update posted successfully.');

        return {
          success: true,
          entry: createdEntry,
        };
      } catch (err) {
        const message = err?.message || 'Failed to post timeline update.';

        setErrorMessage(message);
        error(message);

        return {
          success: false,
          error: message,
        };
      } finally {
        setActionLoading(false);
      }
    },
    [user?.id, projectId, timelineId, success, error]
  );

  // Accepts either a plain string or the `{ content, text }` payload that
  // TimelineEntry sends.
  const replyToEntry = useCallback(
    async (entryId, payload) => {
      if (!user?.id) {
        return {
          success: false,
          error: 'You must be signed in.',
        };
      }

      const content =
        typeof payload === 'string'
          ? payload
          : payload?.content || payload?.text || '';

      if (!entryId || !content.trim()) {
        return {
          success: false,
          error: 'An entry ID and reply content are required.',
        };
      }

      setActionLoading(true);
      setErrorMessage('');

      try {
        const result = await replyToTimelineEntry({
          entryId,
          content: content.trim(),
          projectId,
          timelineId,
        });

        const reply = result?.data ?? result;

        if (!reply) {
          throw new Error('The reply could not be created.');
        }

        setEntries((previous) =>
          previous.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  replies: [...(entry.replies || []), reply],
                }
              : entry
          )
        );

        success('Reply added successfully.');

        return {
          success: true,
          reply,
        };
      } catch (err) {
        const message = err?.message || 'Failed to add reply.';

        setErrorMessage(message);
        error(message);

        return {
          success: false,
          error: message,
        };
      } finally {
        setActionLoading(false);
      }
    },
    [user?.id, projectId, timelineId, success, error]
  );

  const deleteEntry = useCallback(
    async (entryId) => {
      if (!entryId) {
        return {
          success: false,
          error: 'An entry ID is required.',
        };
      }

      setActionLoading(true);
      setErrorMessage('');

      try {
        await deleteTimelineEntry(entryId);

        setEntries((previous) =>
          previous.filter((entry) => entry.id !== entryId)
        );

        success('Timeline entry deleted.');

        return {
          success: true,
        };
      } catch (err) {
        const message = err?.message || 'Failed to delete timeline entry.';

        setErrorMessage(message);
        error(message);

        return {
          success: false,
          error: message,
        };
      } finally {
        setActionLoading(false);
      }
    },
    [success, error]
  );

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const clearError = useCallback(() => {
    setErrorMessage('');
  }, []);

  return {
    entries,
    loading,
    actionLoading,
    errorMessage,
    fetchEntries,
    createEntry,
    replyToEntry,
    deleteEntry,
    refresh: fetchEntries,
    setEntries,
    clearError,
  };
}