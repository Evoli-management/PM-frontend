import apiClient from './apiClient';

const elephantTaskService = {
  // Calendar Elephant Tasks API (simple planning blocks)
  
  /**
   * Get elephant task for a specific calendar period
   */
  async getCalendarElephantTask(viewType, dateStart, dateEnd) {
    try {
      const response = await apiClient.get('/calendar/elephant-tasks/period', {
        params: { viewType, dateStart, dateEnd }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting calendar elephant task:', error);
      return null;
    }
  },

  /**
   * Create or update elephant task for a calendar period
   */
  async upsertCalendarElephantTask(elephantTask, viewType, dateStart, dateEnd) {
    try {
      const response = await apiClient.post('/calendar/elephant-tasks', {
        elephantTask,
        viewType,
        dateStart,
        dateEnd
      });
      return response.data;
    } catch (error) {
      console.error('Error upserting calendar elephant task:', error);
      throw error;
    }
  },

  /**
   * Delete elephant task for a calendar period
   */
  async deleteCalendarElephantTask(viewType, dateStart, dateEnd) {
    try {
      const response = await apiClient.delete('/calendar/elephant-tasks/period', {
        params: { viewType, dateStart, dateEnd }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting calendar elephant task:', error);
      throw error;
    }
  },

  /**
   * Get elephant tasks in a date range
   */
  async getCalendarElephantTasksInRange(fromDate, toDate, viewType = null) {
    try {
      const params = { fromDate, toDate };
      if (viewType) params.viewType = viewType;
      
      const response = await apiClient.get('/calendar/elephant-tasks/range', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting calendar elephant tasks in range:', error);
      return [];
    }
  },

  // Legacy methods for backward compatibility (kept for existing elephant tasks)
  async getElephantTasks() {
    try {
      const response = await apiClient.get('/elephant-tasks');
      return response.data;
    } catch (error) {
      console.error('Error getting elephant tasks:', error);
      return [];
    }
  },
  
  async createElephantTask(data) {
    try {
      const response = await apiClient.post('/elephant-tasks', data);
      return response.data;
    } catch (error) {
      console.error('Error creating elephant task:', error);
      throw error;
    }
  },
  
  async removeElephantTask(id) {
    try {
      const response = await apiClient.delete(`/elephant-tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error removing elephant task:', error);
      throw error;
    }
  },
};

export default elephantTaskService;
