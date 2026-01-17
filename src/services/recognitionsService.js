import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const recognitionsService = {
  /**
   * Create a new recognition/stroke
   */
  async createRecognition(data) {
    try {
      const response = await axios.post(`${API_URL}/recognitions`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      return response.data;
    } catch (error) {
      console.error("Recognition API Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        requestData: data,
      });
      throw error;
    }
  },

  /**
   * Get recognitions
   */
  async getRecognitions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.senderId) params.append('senderId', filters.senderId);
    if (filters.recipientId) params.append('recipientId', filters.recipientId);
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await axios.get(`${API_URL}/recognitions?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Get my recognition score
   */
  async getMyScore() {
    const response = await axios.get(`${API_URL}/recognitions/my-score`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Get user recognition score
   */
  async getUserScore(userId) {
    const response = await axios.get(`${API_URL}/recognitions/user/${userId}/score`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Get recent achievements for a user (last 2 weeks)
   */
  async getRecentAchievements(userId) {
    const response = await axios.get(`${API_URL}/recognitions/recent-achievements/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  /**
   * Get recognition by ID
   */
  async getRecognition(id) {
    const response = await axios.get(`${API_URL}/recognitions/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },
};

export default recognitionsService;
