/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared notification state for the authenticated app.
 *
 * Both the top-header bell (unread indicator) and the Notifications &
 * Announcements page read from this single source of truth, so marking a
 * notification read in one place immediately updates the other. The provider
 * fetches the feed once when the authenticated app mounts.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NotificationItem } from '../types';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services';

interface NotificationsContextValue {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Mark one notification read (or unread when `isRead` is false). */
  markRead: (id: string, isRead?: boolean) => Promise<void>;
  /** Mark every unread notification read. */
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    getNotifications()
      .then(setItems)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load notifications.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const markRead = useCallback(async (id: string, isRead = true) => {
    let previousUnread: boolean | undefined;
    // Optimistic update — flip the row immediately so the bell reacts at once.
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          previousUnread = it.isUnread;
          return { ...it, isUnread: !isRead };
        }
        return it;
      }),
    );
    try {
      await markNotificationRead(id, isRead);
    } catch (err) {
      // Revert on failure.
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, isUnread: previousUnread ?? it.isUnread } : it,
        ),
      );
      throw err;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    let snapshot: NotificationItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.map((it) => ({ ...it, isUnread: false }));
    });
    try {
      await markAllNotificationsRead();
    } catch (err) {
      setItems(snapshot);
      throw err;
    }
  }, []);

  const unreadCount = useMemo(
    () => items.filter((it) => it.isUnread).length,
    [items],
  );

  const value = useMemo(
    () => ({ items, unreadCount, loading, error, reload, markRead, markAllRead }),
    [items, unreadCount, loading, error, reload, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider.');
  }
  return ctx;
}
