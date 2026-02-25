/**
 * Trigger sync for a user/provider via the sync service
 * @param {string} userId
 * @param {'google'|'microsoft'} provider
 * @returns {Promise<object>} sync result
 */
export async function triggerSyncService(userId, provider) {
  // TODO: Set this to your deployed sync service URL
  const SYNC_SERVICE_URL = import.meta.env.VITE_SYNC_SERVICE_URL || 'https://practicalmanager-sync-dev.herokuapp.com';
  const response = await axios.post(`${SYNC_SERVICE_URL}/trigger-sync`, { userId, provider });
  return response.data;
}
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const syncService = {
  /**
   * Trigger manual sync for a provider (Google Tasks or Microsoft To Do)
   */
  async triggerManualSync(provider) {
    // POST to /sync/manual endpoint (assumed backend route)
    // Adjust endpoint as needed to match backend
    const response = await axios.post(`${API_URL}/sync/manual`, { provider });
    return response.data;
  },
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

  /**
   * Get external task sync status for current user
   */
  async getTaskSyncStatus(userId) {
    const response = await axios.get(`${API_URL}/sync/tasks-status/${userId}`);
    return response.data;
  },

  /**
   * Send external tasks to backend (for manual sync/testing)
   */
  async sendExternalTasks(userId, provider, tasks, syncPassword) {
    const response = await axios.post(`${API_URL}/sync/tasks`, {
      sync_password: syncPassword,
      userId,
      provider,
      tasks,
    });
    return response.data;
  },

  /**
   * Delete an external task by externalId
   */
  async deleteExternalTask(userId, provider, externalId, syncPassword) {
    const response = await axios.post(`${API_URL}/sync/delete-task`, {
      sync_password: syncPassword,
      userId,
      provider,
      externalId,
    });
    return response.data;
  },
};
