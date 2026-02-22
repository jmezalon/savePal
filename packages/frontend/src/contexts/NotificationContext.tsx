import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  groupId: string | null;
  sentAt: string;
  group?: { id: string; name: string } | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/unread/count`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data);
        // Update unread count from the fetched data
        setUnreadCount(data.data.filter((n: Notification) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const markAsRead = useCallback(async (id: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [token]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setNotifications(prev => {
          const removed = prev.find(n => n.id === id);
          if (removed && !removed.isRead) {
            setUnreadCount(c => Math.max(0, c - 1));
          }
          return prev.filter(n => n.id !== id);
        });
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [token]);

  // Fetch unread count on mount and start polling
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, fetchUnreadCount]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
