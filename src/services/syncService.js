import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const syncService = {
  /**
   * Get calendar sync status for current user
   */
  async getSyncStatus(userId) {
    const response = await axios.get(`${API_URL}/sync/status/${userId}`);
    return response.data;
  },

  /**
   * Get sync preferences for user
   */
  async getSyncPreferences(userId) {
    const response = await axios.get(`${API_URL}/sync/sync-preferences/${userId}`);
    return response.data;
  },

  /**
   * Enable/disable Outlook sync
   */
  async setOutlookSync(userId, enabled) {
    const response = await axios.put(
      `${API_URL}/sync/sync-preferences/${userId}/outlook`,
      { enabled }
    );
    return response.data;
  },

  /**
   * Enable/disable Google sync
   */
  async setGoogleSync(userId, enabled) {
    const response = await axios.put(
      `${API_URL}/sync/sync-preferences/${userId}/google`,
      { enabled }
    );
    return response.data;
  },
};
