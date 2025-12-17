import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const cultureService = {
  async getValues() {
    const response = await axios.get(`${API_URL}/culture/values`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async getValue(valueId) {
    const response = await axios.get(`${API_URL}/culture/values/${valueId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async createValue(data) {
    const response = await axios.post(`${API_URL}/culture/values`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async updateValue(valueId, data) {
    const response = await axios.patch(`${API_URL}/culture/values/${valueId}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async deleteValue(valueId) {
    const response = await axios.delete(`${API_URL}/culture/values/${valueId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },
};

export default cultureService;
