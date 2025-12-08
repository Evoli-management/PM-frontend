// src/services/milestoneService.js
import apiClient from "./apiClient";

/**
 * A generic error handler for milestone service calls.
 * @param {string} context - The action being performed (e.g., 'creating milestone').
 * @param {Error} error - The caught error object.
 */
const handleMilestoneError = (context, error) => {
    console.error(`Error ${context}:`, error);
    if (error.response && error.response.data && error.response.data.message) {
        const messages = Array.isArray(error.response.data.message)
            ? error.response.data.message.join(", ")
            : error.response.data.message;
        console.error("Backend validation errors:", messages);
        throw new Error(`Failed to ${context}. ${messages}`);
    }
    throw new Error(`Failed to ${context}. ${error.message || "Please try again."}`);
};

/**
 * Creates a new milestone.
 * @param {string} goalId - The ID of the goal to create a milestone for.
 * @param {object} milestoneData - The milestone data to create.
 * @returns {Promise<object>} A promise that resolves to the created milestone.
 */
export const createMilestone = async (goalId, milestoneData) => {
    try {
        // Clean milestone data to match backend expectations
        const cleanData = {
            title: milestoneData.title,
            weight: parseFloat(milestoneData.weight) || 1.0,
        };

        // Handle dates properly - backend 'dueDate' is a SQL DATE (no time).
        if (milestoneData.dueDate) {
            // Normalize to YYYY-MM-DD to avoid DB errors when inserting an ISO datetime
            const d = new Date(milestoneData.dueDate);
            if (!isNaN(d)) {
                cleanData.dueDate = d.toISOString().slice(0, 10);
            }
        }

        // NOTE: don't include 'done' in create operation - it's not allowed

        // Include goalId in the payload and post to the top-level /milestones endpoint
        const payload = {
            goalId,
            ...cleanData,
        };

        console.log("Creating milestone with data:", payload);

        // Backend exposes POST /milestones which accepts { goalId, title, dueDate, weight }
        const response = await apiClient.post(`/milestones`, payload);
        return response.data;
    } catch (error) {
        handleMilestoneError("creating milestone", error);
    }
};

/**
 * Updates an existing milestone by ID.
 * @param {string} milestoneId - The ID of the milestone to update.
 * @param {object} updateData - The updated milestone data.
 * @returns {Promise<object>} A promise that resolves to the updated milestone.
 */
export const updateMilestone = async (milestoneId, updateData) => {
    try {
        // Clean milestone data to match backend expectations
        const cleanData = {};

        // Only include fields that are likely supported by the backend
        if (updateData.title !== undefined) cleanData.title = updateData.title;
        if (updateData.weight !== undefined) cleanData.weight = parseFloat(updateData.weight) || 1.0;

        // Handle dates properly - normalize to YYYY-MM-DD (SQL DATE)
        if (updateData.dueDate !== undefined) {
            if (updateData.dueDate) {
                const d = new Date(updateData.dueDate);
                cleanData.dueDate = !isNaN(d) ? d.toISOString().slice(0, 10) : null;
            } else {
                cleanData.dueDate = null;
            }
        }

        // Try PATCH first for 'done' updates (most likely scenario)
        if (updateData.done !== undefined) {
            try {
                console.log("Trying PATCH for milestone done status");
                const response = await apiClient.patch(`/milestones/${milestoneId}`, { done: updateData.done });
                return response.data;
            } catch (patchError) {
                console.log("PATCH failed, falling back to PUT:", patchError);
                // If patch fails, include done in the PUT request
                cleanData.done = updateData.done;
            }
        }

        console.log("Updating milestone with data:", cleanData);
        try {
            const response = await apiClient.put(`/milestones/${milestoneId}`, cleanData);
            return response.data;
        } catch (putError) {
            // If PUT fails with 404, try PATCH
            if (putError.response?.status === 404) {
                console.log("PUT not supported, trying PATCH");
                const response = await apiClient.patch(`/milestones/${milestoneId}`, cleanData);
                return response.data;
            }
            throw putError;
        }
    } catch (error) {
        handleMilestoneError("updating milestone", error);
    }
};

/**
 * Marks a milestone as done/undone.
 * @param {string} milestoneId - The ID of the milestone.
 * @param {boolean} done - Whether the milestone is done.
 * @returns {Promise<object>} A promise that resolves to the updated milestone.
 */
export const toggleMilestoneDone = async (milestoneId, done) => {
    try {
        console.log(`Marking milestone ${milestoneId} as ${done ? "done" : "not done"}`);

        // Try dedicated endpoint first
        try {
            const response = await apiClient.patch(`/milestones/${milestoneId}/${done ? "complete" : "uncomplete"}`);
            return response.data;
        } catch (endpointError) {
            if (endpointError.response?.status === 404) {
                // Fall back to regular update
                console.log("Toggle endpoint not found, using regular update");
                return await updateMilestone(milestoneId, { done });
            }
            throw endpointError;
        }
    } catch (error) {
        handleMilestoneError(`marking milestone as ${done ? "done" : "not done"}`, error);
    }
};

/**
 * Deletes a milestone by ID.
 * @param {string} milestoneId - The ID of the milestone to delete.
 * @returns {Promise<void>} A promise that resolves when the milestone is deleted.
 */
export const deleteMilestone = async (milestoneId) => {
    try {
        console.log("Deleting milestone:", milestoneId);
        try {
            await apiClient.delete(`/milestones/${milestoneId}`);
            return true;
        } catch (deleteError) {
            if (deleteError.response?.status === 404) {
                // Some backends don't allow direct deletion, try marking as deleted
                console.log("DELETE not supported, trying to mark as deleted");
                await apiClient.patch(`/milestones/${milestoneId}`, {
                    deleted: true,
                });
                return true;
            }
            throw deleteError;
        }
    } catch (error) {
        handleMilestoneError("deleting milestone", error);
    }
};
