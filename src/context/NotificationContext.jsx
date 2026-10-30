import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((previous) =>
      previous.filter((notification) => notification.id !== id)
    );
  }, []);

  const notify = useCallback(
    ({
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
    }) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const notification = {
        id,
        type,
        title,
        message,
        duration,
        createdAt: new Date().toISOString(),
      };

      setNotifications((previous) => [...previous, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    [removeNotification]
  );

  const success = useCallback(
    (message, title = 'Success') =>
      notify({ type: 'success', title, message }),
    [notify]
  );

  const error = useCallback(
    (message, title = 'Error') =>
      notify({ type: 'error', title, message }),
    [notify]
  );

  const warning = useCallback(
    (message, title = 'Warning') =>
      notify({ type: 'warning', title, message }),
    [notify]
  );

  const info = useCallback(
    (message, title = 'Information') =>
      notify({ type: 'info', title, message }),
    [notify]
  );

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      notify,
      success,
      error,
      warning,
      info,
      removeNotification,
      clearNotifications,
    }),
    [
      notifications,
      notify,
      success,
      error,
      warning,
      info,
      removeNotification,
      clearNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider.'
    );
  }

  return context;
}

export default NotificationContext;