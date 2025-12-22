import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const notificationsService = {
  /**
   * Get all notifications for current user
   */
  async getNotifications(limit) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const response = await axios.get(`${API_URL}/notifications?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    const response = await axios.get(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data.count;
  },

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds) {
    const response = await axios.post(
      `${API_URL}/notifications/mark-read`,
      { notificationIds },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }
    );
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const response = await axios.post(
      `${API_URL}/notifications/mark-all-read`,
      {},
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }
    );
    return response.data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId) {
    const response = await axios.delete(`${API_URL}/notifications/${notificationId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },
};

export default notificationsService;
