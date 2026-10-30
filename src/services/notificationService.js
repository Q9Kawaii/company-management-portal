import { supabase } from '../lib/supabase';

const NOTIFICATION_FIELDS = `
  id,
  user_id,
  title,
  message,
  type,
  project_id,
  is_read,
  created_at
`;

const normalizeNotification = (notification) => {
  if (!notification) return null;

  return {
    ...notification,
    userId: notification.user_id,
    projectId: notification.project_id,
    isRead: notification.is_read,
    createdAt: notification.created_at,
  };
};

/**
 * Fetch notifications for a user.
 */
export async function getNotifications(userId, options = {}) {
  if (!userId) {
    throw new Error('A user ID is required to fetch notifications.');
  }

  const { limit = 50, unreadOnly = false } = options;

  let query = supabase
    .from('notifications')
    .select(NOTIFICATION_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch notifications:', error);
    throw new Error('Unable to load notifications.');
  }

  return (data || []).map(normalizeNotification);
}

/**
 * Fetch the number of unread notifications for a user.
 */
export async function getUnreadNotificationCount(userId) {
  if (!userId) {
    throw new Error('A user ID is required.');
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to count unread notifications:', error);
    throw new Error('Unable to load unread notification count.');
  }

  return count || 0;
}

/**
 * Create an in-app notification.
 */
export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  projectId = null,
}) {
  if (!userId || !title?.trim() || !message?.trim()) {
    throw new Error('User ID, title, and message are required.');
  }

  const notification = {
    user_id: userId,
    title: title.trim(),
    message: message.trim(),
    type,
    project_id: projectId,
    is_read: false,
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select(NOTIFICATION_FIELDS)
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    throw new Error('Unable to create notification.');
  }

  return normalizeNotification(data);
}

/**
 * Create the same notification for multiple users.
 */
export async function createNotificationsForUsers({
  userIds,
  title,
  message,
  type = 'info',
  projectId = null,
}) {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];

  if (uniqueUserIds.length === 0) return [];

  if (!title?.trim() || !message?.trim()) {
    throw new Error('Title and message are required.');
  }

  const notifications = uniqueUserIds.map((userId) => ({
    user_id: userId,
    title: title.trim(),
    message: message.trim(),
    type,
    project_id: projectId,
    is_read: false,
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select(NOTIFICATION_FIELDS);

  if (error) {
    console.error('Failed to create notifications:', error);
    throw new Error('Unable to create notifications.');
  }

  return (data || []).map(normalizeNotification);
}

/**
 * Mark one notification as read.
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) {
    throw new Error('A notification ID is required.');
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select(NOTIFICATION_FIELDS)
    .single();

  if (error) {
    console.error('Failed to mark notification as read:', error);
    throw new Error('Unable to update notification.');
  }

  return normalizeNotification(data);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) {
    throw new Error('A user ID is required.');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw new Error('Unable to mark notifications as read.');
  }

  return true;
}

/**
 * Delete a notification.
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) {
    throw new Error('A notification ID is required.');
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to delete notification:', error);
    throw new Error('Unable to delete notification.');
  }

  return true;
}

/**
 * Subscribe to real-time notification changes for a user.
 * Returns a subscription channel that can be passed to unsubscribeNotifications.
 */
export function subscribeToNotifications(userId, callback) {
  if (!userId || typeof callback !== 'function') {
    throw new Error('A user ID and callback function are required.');
  }

  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          notification: normalizeNotification(
            payload.new?.id ? payload.new : payload.old
          ),
          old: payload.old,
        });
      }
    )
    .subscribe();
}

/**
 * Unsubscribe from real-time notification changes.
 */
export async function unsubscribeNotifications(channel) {
  if (!channel) return;

  const { error } = await supabase.removeChannel(channel);

  if (error) {
    console.error('Failed to unsubscribe from notifications:', error);
  }
}