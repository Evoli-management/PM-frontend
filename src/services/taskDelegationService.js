import apiClient from './apiClient';

const base = '/tasks';

const taskDelegationService = {
  /**
   * Delegate a task to another team member
   * @param {string} taskId - Task UUID
   * @param {Object} payload - { delegatedToUserId: string, notes?: string }
   */
  async delegateTask(taskId, payload) {
    const res = await apiClient.post(`${base}/${taskId}/delegate`, payload);
    return res.data;
  },

  /**
   * Get delegation history for a task
   * @param {string} taskId - Task UUID
   */
  async getDelegationHistory(taskId) {
    const res = await apiClient.get(`${base}/${taskId}/delegation-history`);
    return res.data;
  },

  /**
   * Get all tasks delegated to current user
   */
  async getDelegatedToMe(status = null) {
    const params = status ? { status } : {};
    const res = await apiClient.get(`${base}/delegated-to-me`, { params });
    return res.data;
  },

  /**
   * Revoke delegation and return task to owner
   * @param {string} taskId - Task UUID
   */
  async revokeDelegation(taskId) {
    const res = await apiClient.delete(`${base}/${taskId}/delegation`);
    return res.data;
  },

  /**
   * Accept a delegated task - creates new task in selected key area
   * @param {string} taskId - Task UUID
   * @param {Object} payload - { keyAreaId: string (required), reason?: string }
   */
  async acceptDelegation(taskId, payload) {
    const res = await apiClient.post(`${base}/${taskId}/delegation/accept`, payload);
    return res.data;
  },

  /**
   * Reject a delegated task
   */
  async rejectDelegation(taskId, reason = '') {
    const res = await apiClient.post(`${base}/${taskId}/delegation/reject`, {
      reason: reason || undefined,
    });
    return res.data;
  },
};

export default taskDelegationService;
