// src/services/milestoneService.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * A generic error handler for milestone service calls.
 * @param {string} context - The action being performed (e.g., 'updating milestone').
 * @param {Error} error - The caught error object.
 */
const handleError = (context, error) => {
    console.error(`Error ${context}:`, error);
    if (error.response && error.response.data && error.response.data.message) {
        const messages = Array.isArray(error.response.data.message) 
            ? error.response.data.message.join(', ') 
            : error.response.data.message;
        throw new Error(`Failed to ${context}. ${messages}`);
    }
    throw error;
};

/**
 * Updates an existing milestone.
 * @param {string} id - The ID of the milestone to update.
 * @param {object} updateData - The data for the update (e.g., { done: true }).
 * @returns {Promise<object>} A promise that resolves to the updated milestone.
 */
export const updateMilestone = async (id, updateData) => {
    try {
        const response = await apiClient.put(`/milestones/${id}`, updateData);
        return response.data;
    } catch (error) {
        handleError(`updating milestone ${id}`, error);
    }
};
