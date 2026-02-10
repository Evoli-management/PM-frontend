import apiClient from './apiClient';

const base = '/activities';

const activityDelegationService = {
  /**
   * Delegate an activity to another team member
   * @param {string} activityId - Activity UUID
   * @param {Object} payload - { delegatedToUserId: string, notes?: string }
   */
  async delegateActivity(activityId, payload) {
    const res = await apiClient.post(`${base}/${activityId}/delegate`, payload);
    return res.data;
  },

  /**
   * Get delegation history for an activity
   * @param {string} activityId - Activity UUID
   */
  async getDelegationHistory(activityId) {
    const res = await apiClient.get(`${base}/${activityId}/delegation/history`);
    return res.data;
  },

  /**
   * Get all activities delegated to current user
   * @param {string|null} status - Optional status filter: 'pending', 'accepted', 'rejected'
   */
  async getDelegatedToMe(status = null) {
    const params = status ? { status } : {};
    const res = await apiClient.get(`${base}/delegated-to-me`, { params });
    return res.data;
  },

  /**
   * Revoke delegation and return activity to owner
   * @param {string} activityId - Activity UUID
   */
  async revokeDelegation(activityId) {
    const res = await apiClient.delete(`${base}/${activityId}/delegation`);
    return res.data;
  },

  /**
   * Accept a delegated activity
   * @param {string} activityId - Activity UUID
   * @param {Object} payload - { keyAreaId: string (required), taskId?: string, reason?: string }
   *   - If taskId provided: adds activity to existing task
   *   - If taskId null: converts activity into new task in selected key area
   */
  async acceptDelegation(activityId, payload) {
    const res = await apiClient.post(`${base}/${activityId}/delegation/accept`, payload);
    return res.data;
  },

  /**
   * Reject a delegated activity
   * @param {string} activityId - Activity UUID
   * @param {string} reason - Optional reason for rejection
   */
  async rejectDelegation(activityId, reason = '') {
    const res = await apiClient.post(`${base}/${activityId}/delegation/reject`, {
      reason: reason || undefined,
    });
    return res.data;
  },
};

export default activityDelegationService;
