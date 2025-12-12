import apiClient from './apiClient';

const base = '/reminders';

const remindersService = {
  /**
   * Get reminders due in the next window (in seconds)
   * @param {number} windowSeconds - Time window in seconds (default 60)
   * @returns {Promise<Array>} Array of due reminders
   */
  async getDue(windowSeconds = 60) {
    try {
      const res = await apiClient.get(`${base}/due`);
      return res.data || [];
    } catch (error) {
      console.error('Failed to get due reminders:', error);
      return [];
    }
  },

  /**
   * Get all reminders for the authenticated user
   * @returns {Promise<Array>} Array of reminders
   */
  async list() {
    try {
      const res = await apiClient.get(base);
      return res.data || [];
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      throw error;
    }
  },

  /**
   * Get a single reminder by ID
   * @param {string} id - Reminder ID
   * @returns {Promise<Object>} Reminder object
   */
  async get(id) {
    try {
      const res = await apiClient.get(`${base}/${id}`);
      return res.data;
    } catch (error) {
      console.error(`Failed to fetch reminder ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new reminder
   * @param {Object} payload - Reminder data
   * @returns {Promise<Object>} Created reminder
   */
  async create(payload) {
    try {
      const res = await apiClient.post(base, payload);
      return res.data;
    } catch (error) {
      console.error('Failed to create reminder:', error);
      throw error;
    }
  },

  /**
   * Update an existing reminder
   * @param {string} id - Reminder ID
   * @param {Object} payload - Fields to update
   * @returns {Promise<Object>} Updated reminder
   */
  async update(id, payload) {
    try {
      const res = await apiClient.patch(`${base}/${id}`, payload);
      return res.data;
    } catch (error) {
      console.error(`Failed to update reminder ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a reminder
   * @param {string} id - Reminder ID
   * @returns {Promise<Object>} Success response
   */
  async delete(id) {
    try {
      const res = await apiClient.delete(`${base}/${id}`);
      return res.data;
    } catch (error) {
      console.error(`Failed to delete reminder ${id}:`, error);
      throw error;
    }
  },

  /**
   * Mark a reminder as sent
   * @param {string} id - Reminder ID
   * @returns {Promise<Object>} Updated reminder
   */
  async markAsSent(id) {
    try {
      const res = await apiClient.post(`${base}/${id}/mark-sent`);
      return res.data;
    } catch (error) {
      console.error(`Failed to mark reminder ${id} as sent:`, error);
      throw error;
    }
  },

  /**
   * Get available recurrence patterns
   * @returns {Array} Available recurrence options
   */
  getRecurrencePatterns() {
    return [
      { value: 'none', label: 'No repeat' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ];
  },

  /**
   * Get available reminder statuses
   * @returns {Array} Available status options
   */
  getStatuses() {
    return [
      { value: 'pending', label: 'Pending' },
      { value: 'sent', label: 'Sent' },
      { value: 'dismissed', label: 'Dismissed' },
      { value: 'cancelled', label: 'Cancelled' },
    ];
  },
};

export default remindersService;
