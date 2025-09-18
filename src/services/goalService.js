// src/services/goalService.js
import apiClient from "./apiClient";

/**
 * A helper to handle API errors consistently.
 * @param {string} context - The context of the API call (e.g., 'fetching goals').
 * @param {Error} error - The error object caught.
 */
const handleError = (context, error) => {
    console.error(`Error ${context}:`, error);
    if (error.response && error.response.data && error.response.data.message) {
        // Log detailed validation errors from the NestJS backend
        console.error("Backend validation errors:", error.response.data.message);
        // We can create a more user-friendly error message here if needed
        const messages = Array.isArray(error.response.data.message)
            ? error.response.data.message.join(", ")
            : error.response.data.message;
        throw new Error(`Failed to ${context.split(" ")[0]} goal. ${messages}`);
    }
    throw error;
};

/**
 * Fetches all goals from the API.
 * @returns {Promise<Array>} A promise that resolves to an array of goals.
 */
export const getGoals = async () => {
    try {
        const response = await apiClient.get("/goals");
        return response.data;
    } catch (error) {
        handleError("fetching goals", error);
    }
};

/**
 * Fetches a single goal by its ID.
 * @param {string} id - The ID of the goal to fetch.
 * @returns {Promise<object>} A promise that resolves to the goal object.
 */
export const getGoalById = async (id) => {
    try {
        const response = await apiClient.get(`/goals/${id}`);
        return response.data;
    } catch (error) {
        handleError(`fetching goal ${id}`, error);
    }
};

/**
 * Creates a new goal.
 * @param {object} goalData - The data for the new goal, matching the CreateGoalDto.
 * @returns {Promise<object>} A promise that resolves to the newly created goal.
 */
export const createGoal = async (goalData) => {
    try {
        const response = await apiClient.post("/goals", goalData);
        return response.data;
    } catch (error) {
        handleError("creating goal", error);
    }
};

/**
 * Updates an existing goal.
 * @param {string} id - The ID of the goal to update.
 * @param {object} updateData - The data to update, matching UpdateGoalDto.
 * @returns {Promise<object>} A promise that resolves to the updated goal.
 */
export const updateGoal = async (id, updateData) => {
    try {
        const response = await apiClient.put(`/goals/${id}`, updateData);
        return response.data;
    } catch (error) {
        handleError(`updating goal ${id}`, error);
    }
};

/**
 * Deletes a goal by its ID.
 * @param {string} id - The ID of the goal to delete.
 * @returns {Promise<void>}
 */
export const deleteGoal = async (id) => {
    try {
        await apiClient.delete(`/goals/${id}`);
    } catch (error) {
        handleError(`deleting goal ${id}`, error);
    }
};
