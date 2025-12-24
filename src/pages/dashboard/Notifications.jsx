import React, { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar";
import DashboardContainer from "../../components/dashboard/DashboardContainer";
import DashboardTile from "../../components/dashboard/DashboardTile";
import { FaBars, FaCheckCircle, FaTrash } from "react-icons/fa";
import notificationsService from "../../services/notificationsService";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationsService.getNotifications();
            setNotifications(data);
        } catch (err) {
            console.error("Failed to load notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.isRead) {
            await notificationsService.markAsRead([notification.id]);
        }

        // Navigate to link if available
        if (notification.linkUrl) {
            navigate(notification.linkUrl);
        }

        // Reload notifications
        loadNotifications();
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            loadNotifications();
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const handleDelete = async (e, notificationId) => {
        e.stopPropagation();
        try {
            await notificationsService.deleteNotification(notificationId);
            loadNotifications();
        } catch (err) {
            console.error("Failed to delete notification:", err);
        }
    };

    const formatTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMs = now - date;
        const diffInMins = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMs / 3600000);
        const diffInDays = Math.floor(diffInMs / 86400000);

        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${diffInDays}d ago`;
    };
    
    return (
        <div className="flex min-h-screen">
            <Sidebar 
                user={{ name: "Hussein" }} 
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            <DashboardContainer title="Notifications">
                <div className="col-span-full mb-4 px-1">
                    <a href="#/dashboard" className="text-sm text-blue-600">← Back to Dashboard</a>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-gray-600 dark:text-gray-300">Your recent activity and alerts.</p>
                        {notifications.some(n => !n.isRead) && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        Loading notifications...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        No notifications yet
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <DashboardTile 
                            key={notification.id} 
                            className={`flex justify-between items-start cursor-pointer hover:bg-gray-50 transition ${
                                !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="flex-1">
                                <div className="font-medium text-gray-800 dark:text-slate-200">
                                    {notification.title}
                                </div>
                                {notification.message && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {notification.message}
                                    </div>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                    {formatTime(notification.createdAt)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                {notification.isRead && (
                                    <FaCheckCircle className="text-green-500" />
                                )}
                                <button
                                    onClick={(e) => handleDelete(e, notification.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </DashboardTile>
                    ))
                )}
            </DashboardContainer>
        </div>
    );
}
