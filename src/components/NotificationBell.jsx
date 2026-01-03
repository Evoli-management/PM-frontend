import React, { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import notificationsService from '../services/notificationsService';
import styles from '../styles/NotificationBell.module.css';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationsService.getNotifications();
            const unread = data.filter(n => !n.isRead);
            setNotifications(unread.slice(0, 5)); // Show only last 5 unread
            setUnreadCount(unread.length);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationsService.markAsRead(notificationId);
            setNotifications(notifications.filter(n => n.id !== notificationId));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'stroke_received':
                return '🎉';
            case 'stroke_reminder':
                return '💡';
            case 'team_invite':
                return '👥';
            default:
                return '📢';
        }
    };

    return (
        <div className={styles.notificationBellContainer}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={styles.bellButton}
                title="Notifications"
            >
                <FaBell className={styles.bellIcon} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div ref={dropdownRef} className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => {
                                    setNotifications([]);
                                    setUnreadCount(0);
                                }}
                                className={styles.clearButton}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className={styles.loading}>Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className={styles.empty}>
                            <FaBell className={styles.emptyIcon} />
                            <p>No new notifications</p>
                        </div>
                    ) : (
                        <div className={styles.notificationList}>
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={styles.notificationItem}
                                >
                                    <div className={styles.notificationContent}>
                                        <span className={styles.icon}>
                                            {getNotificationIcon(notification.type)}
                                        </span>
                                        <div className={styles.textContent}>
                                            <h4>{notification.title}</h4>
                                            <p>{notification.message}</p>
                                            <span className={styles.time}>
                                                {formatTime(new Date(notification.createdAt))}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        className={styles.closeButton}
                                        title="Dismiss"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.footer}>
                        <a href="/strokes" className={styles.footerLink}>
                            View All Notifications
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
