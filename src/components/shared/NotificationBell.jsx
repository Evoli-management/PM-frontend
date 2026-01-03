import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import notificationsService from '../../services/notificationsService';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Load unread count on mount and periodically
  useEffect(() => {
    loadUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      console.error('Failed to load unread count:', err);
      setError(err);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getNotifications(10); // Last 10 notifications
      setNotifications(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!showDropdown) {
      loadNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsService.markAsRead([notificationId]);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      await loadUnreadCount();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      await loadUnreadCount();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'stroke_received':
        return '🎉';
      case 'stroke_reminder':
        return '💝';
      case 'milestone_completed':
        return '🎯';
      case 'goal_completed':
        return '✅';
      default:
        return '📢';
    }
  };

  const getNotificationTitle = (notification) => {
    return notification.title || 'Notification';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={handleBellClick}
        className="relative p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title={unreadCount > 0 ? `${unreadCount} new notification(s)` : 'No new notifications'}
        aria-label="Notifications"
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">
                Failed to load notifications
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-800 text-sm">
                              {getNotificationTitle(notification)}
                            </p>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
                        title="Delete"
                      >
                        <FaTimes size={14} />
                      </button>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="mt-2 text-xs text-blue-500 hover:text-blue-600 font-medium"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - View All */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-3 text-center">
              <a
                href="/notifications"
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
