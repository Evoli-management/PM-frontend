import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Ensure image URLs have proper BASE_URL prepended
 * Backend returns relative paths like /strokes/01.png
 * Frontend needs to convert them to /PM-frontend/strokes/01.png on GitHub Pages or keep as-is elsewhere
 */
const normalizeImageUrl = (url) => {
  if (!url) return url;
  
  // If it's already an absolute URL or data URI, return as-is
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  
  // If it starts with /strokes/, prepend BASE_URL
  if (url.startsWith('/strokes/')) {
    return `${BASE_URL}${url.substring(1)}`;
  }
  
  return url;
};

const cultureService = {
  async getValues() {
    const response = await axios.get(`${API_URL}/culture/values`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    // Normalize image URLs in response
    return (response.data || []).map(value => ({
      ...value,
      imageUrl: normalizeImageUrl(value.imageUrl)
    }));
  },

  async getValue(valueId) {
    const response = await axios.get(`${API_URL}/culture/values/${valueId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return {
      ...response.data,
      imageUrl: normalizeImageUrl(response.data.imageUrl)
    };
  },

  async createValue(data) {
    const response = await axios.post(`${API_URL}/culture/values`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return {
      ...response.data,
      imageUrl: normalizeImageUrl(response.data.imageUrl)
    };
  },

  async updateValue(valueId, data) {
    const response = await axios.patch(`${API_URL}/culture/values/${valueId}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return {
      ...response.data,
      imageUrl: normalizeImageUrl(response.data.imageUrl)
    };
  },

  async deleteValue(valueId) {
    const response = await axios.delete(`${API_URL}/culture/values/${valueId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },
};

export default cultureService;
