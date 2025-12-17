import apiClient from './apiClient';

/**
 * Submit an eNPS response
 */
export const submitEnpsResponse = async (score, comment = null) => {
  try {
    const response = await apiClient.post('/enps/response', {
      score,
      comment,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting eNPS response:', error);
    throw error;
  }
};

/**
 * Get the current eNPS score for the organization
 */
export const getCurrentEnpsScore = async () => {
  try {
    const response = await apiClient.get('/enps/current-score');
    return response.data;
  } catch (error) {
    console.error('Error fetching current eNPS score:', error);
    throw error;
  }
};

/**
 * Get eNPS trend over time
 */
export const getEnpsTrend = async (periods = 12) => {
  try {
    const response = await apiClient.get('/enps/trend', {
      params: { periods },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching eNPS trend:', error);
    throw error;
  }
};

/**
 * Check if the current user has responded in the current period
 */
export const hasUserResponded = async () => {
  try {
    const response = await apiClient.get('/enps/has-responded');
    return response.data.hasResponded;
  } catch (error) {
    console.error('Error checking if user responded:', error);
    throw error;
  }
};

/**
 * Get the current user's response for the current period
 */
export const getMyEnpsResponse = async () => {
  try {
    const response = await apiClient.get('/enps/my-response');
    return response.data;
  } catch (error) {
    console.error('Error fetching my eNPS response:', error);
    throw error;
  }
};
