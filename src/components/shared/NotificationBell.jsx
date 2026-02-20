import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import notificationsService from '../../services/notificationsService';
import recognitionsService from '../../services/recognitionsService';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [strokeDetails, setStrokeDetails] = useState({}); // Map of notificationId -> stroke data
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
      
      // Load stroke details for any stroke_received notifications
      const newStrokeDetails = { ...strokeDetails };
      for (const notif of data) {
        if (notif.type === 'stroke_received' && notif.entityId && !newStrokeDetails[notif.id]) {
          try {
            const strokeData = await recognitionsService.getRecognition(notif.entityId);
            newStrokeDetails[notif.id] = strokeData;
          } catch (err) {
            console.error(`Failed to load stroke ${notif.entityId}:`, err);
          }
        }
      }
      setStrokeDetails(newStrokeDetails);
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
      case 'task_delegated':
        return '📋';
      case 'task_accepted':
        return '✅';
      case 'task_rejected':
        return '❌';
      default:
        return '📢';
    }
  };

  const getStrokeTypeLabel = (type) => {
    switch (type) {
      case 'employeeship':
        return 'Employeeship';
      case 'performance':
        return 'Performance';
      case 'achievement':
        return 'Achievement';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const renderStrokeCard = (stroke) => {
    if (!stroke) return null;
    
    return (
      <div className="mt-2 p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
            {getStrokeTypeLabel(stroke.type)} Recognition
          </span>
          <span className="text-xs text-gray-500">+{stroke.recipientPoints || 2} pts</span>
        </div>
        
        {stroke.cultureValue && (
          <div className="text-xs text-gray-700 mb-1">
            <span className="font-semibold">Value:</span> {stroke.cultureValue.heading}
          </div>
        )}
        
        {stroke.keyArea && (
          <div className="text-xs text-gray-700 mb-1">
            <span className="font-semibold">Area:</span> {stroke.keyArea.name}
          </div>
        )}
        
        {stroke.goal && (
          <div className="text-xs text-gray-700 mb-1">
            <span className="font-semibold">Goal:</span> {stroke.goal.title}
          </div>
        )}
        
        {stroke.milestone && (
          <div className="text-xs text-gray-700 mb-1">
            <span className="font-semibold">Milestone:</span> {stroke.milestone.title}
          </div>
        )}
        
        {stroke.selectedBehaviors && stroke.selectedBehaviors.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {stroke.selectedBehaviors.map((behavior, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-purple-200 text-purple-800 text-xs rounded">
                {behavior}
              </span>
            ))}
          </div>
        )}
        
        {stroke.personalNote && (
          <div className="mt-2 pt-2 border-t border-purple-200">
            <p className="text-xs text-gray-700 italic">"{stroke.personalNote}"</p>
          </div>
        )}
      </div>
    );
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
                    style={{ cursor: 'pointer' }}
                    onClick={async () => {
                      // Mark as read
                      await handleMarkAsRead(notification.id);
                      // Navigate based on notification type
                      if (
                        notification.type === 'task_delegated' ||
                        notification.type === 'task_accepted' ||
                        notification.type === 'task_rejected' ||
                        notification.type === 'activity_delegated' ||
                        notification.type === 'activity_accepted' ||
                        notification.type === 'activity_rejected'
                      ) {
                        // Go to delegated tab
                        window.location.hash = '#/key-areas?view=delegated';
                        setShowDropdown(false);
                      }
                      // Add more navigation logic for other types as needed
                    }}
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
                            {/* Display stroke card if this is a stroke notification */}
                            {notification.type === 'stroke_received' && strokeDetails[notification.id] && (
                              renderStrokeCard(strokeDetails[notification.id])
                            )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
                        title="Delete"
                      >
                        <FaTimes size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - View All */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-3 text-center">
              <button
                type="button"
                onClick={() => {
                  try {
                    // For HashRouter, navigate to the hash-based route without full reload
                    window.location.hash = '#/notifications';
                  } catch (err) {
                    console.error('Failed to navigate to notifications page', err);
                  }
                  setShowDropdown(false);
                }}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
