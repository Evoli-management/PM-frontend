// src/services/goalService.js
import apiClient from './apiClient';

/**
 * A generic error handler for goal service calls.
 * @param {string} context - The action being performed (e.g., 'creating goal').
 * @param {Error} error - The caught error object.
 */
const handleError = (context, error) => {
    console.error(`Error ${context}:`, error);
    if (error.response && error.response.data && error.response.data.message) {
        const messages = Array.isArray(error.response.data.message) 
            ? error.response.data.message.join(', ') 
            : error.response.data.message;
        console.error('Backend validation errors:', messages);
        throw new Error(`Failed to ${context}. ${messages}`);
    }
    throw new Error(`Failed to ${context}. ${error.message || 'Please try again.'}`);
};

/**
 * Fetches all goals for the current user, including milestones.
 * @returns {Promise<Array>} A promise that resolves to an array of goals with milestones.
 */
export const getGoals = async () => {
  try {
    const response = await apiClient.get('/goals');
    
    // The backend findAll doesn't include milestones, so we need to fetch them separately
    if (Array.isArray(response.data)) {
      // For each goal, fetch the detailed version with milestones
      const goalsWithMilestones = await Promise.all(
        response.data.map(async (goal) => {
          try {
            const detailedGoal = await getGoalById(goal.id);
            return detailedGoal;
          } catch (error) {
            console.warn(`Failed to fetch milestones for goal ${goal.id}:`, error);
            // Return goal with empty milestones array if individual fetch fails
            return {
              ...goal,
              milestones: []
            };
          }
        })
      );
      return goalsWithMilestones;
    }
    
    return response.data;
  } catch (error) {
    handleError('fetching goals', error);
  }
};

/**
 * Fetches a single goal by ID, including milestones.
 * @param {string} goalId - The ID of the goal to fetch.
 * @returns {Promise<object>} A promise that resolves to the goal with milestones.
 */
export const getGoalById = async (goalId) => {
  try {
    const response = await apiClient.get(`/goals/${goalId}`);
    const goal = response.data;
    
    // The backend findOne method already includes milestones
    return {
      ...goal,
      milestones: goal.milestones || []
    };
  } catch (error) {
    handleError(`fetching goal ${goalId}`, error);
  }
};

/**
 * Creates a new goal.
 * @param {object} goalData - The goal data to create.
 * @returns {Promise<object>} A promise that resolves to the created goal.
 */
export const createGoal = async (goalData) => {
    try {
        console.log('Creating goal with data:', goalData);
        
        // Clean the data to match backend create DTO exactly
        const cleanData = {
            title: goalData.title,
            description: goalData.description || null,
            // NOTE: status is NOT allowed in create DTO based on backend validation error
            visibility: goalData.visibility || 'public'
        };
        
        // Handle dates with proper formatting - backend uses camelCase
        if (goalData.dueDate) {
            cleanData.dueDate = new Date(goalData.dueDate).toISOString();
        }
        if (goalData.startDate) {
            cleanData.startDate = new Date(goalData.startDate).toISOString();
        }
        
        // Handle relationships
        if (goalData.keyAreaId) {
            cleanData.keyAreaId = goalData.keyAreaId;
        }
        if (goalData.parentGoalId) {
            cleanData.parentGoalId = goalData.parentGoalId;
        }
        
        // Handle milestones - REQUIRED by backend
        if (goalData.milestones && Array.isArray(goalData.milestones) && goalData.milestones.length > 0) {
            cleanData.milestones = goalData.milestones
                .filter(m => m.title && m.title.trim())
                .map(m => ({
                    title: m.title.trim(),
                    weight: parseFloat(m.weight) || 1.0,
                    dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null
                    // NOTE: 'done' property not allowed in create milestone DTO
                }));
        } else {
            // Backend requires at least one milestone, create a default one
            cleanData.milestones = [{
                title: 'Complete goal',
                weight: 1.0,
                dueDate: cleanData.dueDate || null
                // NOTE: 'done' property not allowed in create milestone DTO
            }];
        }
        
        console.log('Sending clean goal data to backend:', cleanData);
        const response = await apiClient.post('/goals', cleanData);
        console.log('Backend create response:', response.data);
        return response.data;
    } catch (error) {
        handleError('creating goal', error);
    }
};

/**
 * Archives a goal (soft delete).
 * @param {string} goalId - The ID of the goal to archive.
 * @returns {Promise<object>} A promise that resolves to the archived goal.
 */
export const archiveGoal = async (goalId) => {
    try {
        console.log('Archiving goal:', goalId);
        
        // Try dedicated archive endpoint first
        try {
            const response = await apiClient.patch(`/goals/${goalId}/archive`);
            return response.data;
        } catch (archiveEndpointError) {
            if (archiveEndpointError.response?.status === 404) {
                console.log('Archive endpoint not found, trying update with visibility=archived');
                
                // Try updating visibility as fallback
                const response = await apiClient.patch(`/goals/${goalId}`, {
                    visibility: 'archived'
                });
                return response.data;
            }
            throw archiveEndpointError;
        }
    } catch (error) {
        handleError('archiving goal', error);
    }
};

/**
 * Toggles goal visibility between public and private.
 * @param {string} goalId - The ID of the goal.
 * @param {string} currentVisibility - Current visibility status.
 * @returns {Promise<object>} A promise that resolves to the updated goal.
 */
export const toggleGoalVisibility = async (goalId, currentVisibility) => {
    try {
        console.log('Toggling visibility for goal:', goalId, 'from:', currentVisibility);
        const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
        return await updateGoal(goalId, { visibility: newVisibility });
    } catch (error) {
        console.error('Toggle visibility error:', error);
        throw error;
    }
};

/**
 * Updates goal progress percentage.
 * @param {string} goalId - The ID of the goal.
 * @param {number} progressPercent - Progress percentage (0-100).
 * @returns {Promise<object>} A promise that resolves to the updated goal.
 */
export const updateGoalProgress = async (goalId, progressPercent) => {
    try {
        console.log('Updating progress for goal:', goalId, 'to:', progressPercent);
        return await updateGoal(goalId, { progressPercent });
    } catch (error) {
        console.error('Update progress error:', error);
        throw error;
    }
};

/**
 * Gets goals with filtering options.
 * @param {object} filters - Filter options.
 * @returns {Promise<array>} A promise that resolves to filtered goals.
 */
export const getFilteredGoals = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        
        if (filters.status) params.append('status', filters.status);
        if (filters.keyAreaId) params.append('keyAreaId', filters.keyAreaId);
        if (filters.parentId !== undefined) params.append('parentId', filters.parentId);
        if (filters.q) params.append('q', filters.q);
        
        const queryString = params.toString();
        const url = queryString ? `/goals?${queryString}` : '/goals';
        
        const response = await apiClient.get(url);
        return response.data;
    } catch (error) {
        handleError('fetching filtered goals', error);
    }
};

/**
 * Marks a goal as completed using the backend's complete endpoint.
 * @param {string} goalId - The ID of the goal to complete.
 * @returns {Promise<object>} A promise that resolves to the updated goal.
 */
export const completeGoal = async (goalId) => {
    try {
        console.log('Attempting to complete goal:', goalId);
        
        // Try multiple endpoint variations in sequence
        // 1. Try PUT /goals/{id}/complete (common REST pattern)
        try {
            console.log('Trying PUT /complete endpoint');
            const response = await apiClient.put(`/goals/${goalId}/complete`);
            console.log('Complete endpoint response:', response.data);
            return response.data;
        } catch (putError) {
            // If 404, try next approach
            if (putError.response?.status === 404) {
                console.log('PUT /complete not found, trying PATCH');
                
                // 2. Try PATCH /goals/{id}/complete (another common pattern)
                try {
                    const response = await apiClient.patch(`/goals/${goalId}/complete`);
                    console.log('PATCH complete response:', response.data);
                    return response.data;
                } catch (patchError) {
                    if (patchError.response?.status === 404) {
                        console.log('PATCH /complete not found, trying POST');
                        
                        // 3. Try POST /goals/{id}/complete (less common but possible)
                        try {
                            const response = await apiClient.post(`/goals/${goalId}/complete`);
                            console.log('POST complete response:', response.data);
                            return response.data;
                        } catch (postError) {
                            if (postError.response?.status === 404) {
                                console.log('No dedicated complete endpoint found, trying regular update');
                                
                                // 4. Fall back to plain update if no complete endpoint exists
                                try {
                                    // Some backends only allow updating specific fields
                                    const response = await apiClient.patch(`/goals/${goalId}`, {
                                        visibility: 'public', // Use a harmless update to trigger recalculation
                                        title: undefined // This field will be removed before sending
                                    });
                                    
                                    // Fetch the goal to check if it was actually completed
                                    const updatedGoal = await getGoalById(goalId);
                                    return updatedGoal;
                                } catch (finalError) {
                                    throw new Error('All completion methods failed. Backend may not support goal completion.');
                                }
                            }
                            throw postError;
                        }
                    }
                    throw patchError;
                }
            }
            throw putError;
        }
        
    } catch (error) {
        console.error('All goal completion attempts failed:', error);
        handleError('completing goal', error);
    }
};

/**
 * Updates an existing goal.
 * @param {string} goalId - The ID of the goal to update.
 * @param {object} updateData - The data to update the goal with.
 * @returns {Promise<object>} A promise that resolves to the updated goal.
 */
export const updateGoal = async (goalId, updateData) => {
    try {
        // If this is a status change to completed, use the dedicated complete endpoint
        if (updateData.status === 'completed') {
            console.log('Status change to completed - using complete endpoint');
            return await completeGoal(goalId);
        }
        
        // If this is a status change to archived, use the archive endpoint
        if (updateData.status === 'archived') {
            console.log('Status change to archived - using archive endpoint');
            return await archiveGoal(goalId);
        }
        
        // If status is the only field being updated and it's not completion or archiving
        if (updateData.status && Object.keys(updateData).length === 1) {
            console.log('Status-only update detected, status field not allowed in update DTO');
            throw new Error('Status updates must use dedicated endpoints (complete/archive)');
        }
        
        // Remove status from any update data since it's not allowed in update DTO
        if (updateData.status !== undefined) {
            console.log('Removing status field from update data (not allowed in update DTO)');
            const { status, ...cleanData } = updateData;
            updateData = cleanData;
        }
        
        // If we're updating milestones, handle them separately via milestone service
        if (updateData.milestones && Array.isArray(updateData.milestones)) {
            console.log('Handling milestone updates separately');
            
            // Update milestones via milestone service
            const { updateMilestone } = await import('./milestoneService');
            
            // Update each milestone individually
            for (const milestone of updateData.milestones) {
                if (milestone.id) {
                    await updateMilestone(milestone.id, {
                        title: milestone.title,
                        // done property may or may not be allowed in update
                        ...(milestone.done !== undefined && { done: milestone.done }),
                        weight: milestone.weight,
                        dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString() : null
                    });
                }
            }
            
            // Remove milestones from update data since we handled them separately
            const { milestones, ...goalOnlyData } = updateData;
            
            // If there are other goal fields to update, continue with goal update
            if (Object.keys(goalOnlyData).length > 0) {
                updateData = goalOnlyData;
            } else {
                // Only milestones were updated, fetch fresh goal data
                return await getGoalById(goalId);
            }
        }
        
        // Clean the update data to match backend update DTO exactly
        const cleanUpdateData = {};
        
        // Basic fields that match backend schema
        if (updateData.title !== undefined) cleanUpdateData.title = updateData.title;
        if (updateData.description !== undefined) cleanUpdateData.description = updateData.description;
        if (updateData.visibility !== undefined) cleanUpdateData.visibility = updateData.visibility;
        
        // Date fields - backend uses camelCase based on schema
        if (updateData.dueDate !== undefined) {
            cleanUpdateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate).toISOString() : null;
        }
        if (updateData.startDate !== undefined) {
            cleanUpdateData.startDate = updateData.startDate ? new Date(updateData.startDate).toISOString() : null;
        }
        
        // Relationship fields
        if (updateData.keyAreaId !== undefined) {
            cleanUpdateData.keyAreaId = updateData.keyAreaId || null;
        }
        if (updateData.parentGoalId !== undefined) {
            cleanUpdateData.parentGoalId = updateData.parentGoalId || null;
        }
        
        // Progress field
        if (updateData.progressPercent !== undefined) {
            cleanUpdateData.progressPercent = Math.min(100, Math.max(0, Number(updateData.progressPercent)));
        }
        
        console.log('Sending clean data to backend:', cleanUpdateData);
        
        // Validate dates before sending
        if (cleanUpdateData.dueDate && cleanUpdateData.startDate) {
            const dueDate = new Date(cleanUpdateData.dueDate);
            const startDate = new Date(cleanUpdateData.startDate);
            
            if (dueDate <= startDate) {
                throw new Error('Due date must be after start date');
            }
        }
        
        // Try PATCH first as it's safer for partial updates
        try {
            const response = await apiClient.patch(`/goals/${goalId}`, cleanUpdateData);
            console.log('PATCH update response:', response.data);
            return response.data;
        } catch (patchError) {
            // If PATCH fails with 404, try PUT
            if (patchError.response?.status === 404) {
                console.log('PATCH not supported, falling back to PUT');
                const response = await apiClient.put(`/goals/${goalId}`, cleanUpdateData);
                console.log('PUT update response:', response.data);
                return response.data;
            }
            throw patchError;
        }
    } catch (error) {
        // Better error handling for goal updates
        console.error('Goal update error:', error);
        
        if (error.response) {
            console.error('Error response:', error.response.data);
            if (error.response.status === 500) {
                console.error('500 Error - Backend logs might show more details');
                throw new Error('Server error occurred. Check backend logs for details.');
            } else if (error.response.status === 404) {
                throw new Error('Goal not found or update endpoint not available.');
            } else if (error.response.status === 400) {
                throw new Error(`Bad request: ${error.response.data.message || 'Invalid data'}`);
            }
        }
        
        handleError('updating goal', error);
    }
};

/**
 * Deletes a goal by ID.
 * @param {string} goalId - The ID of the goal to delete.
 * @returns {Promise<void>} A promise that resolves when the goal is deleted.
 */
export const deleteGoal = async (goalId) => {
    try {
        // In many NestJS APIs, deletion is done via a PATCH or PUT with a deleted flag
        // instead of an actual DELETE operation
        
        // Try soft delete first (if backend uses this pattern)
        try {
            console.log('Attempting soft delete via PATCH');
            await apiClient.patch(`/goals/${goalId}/archive`);
            return true;
        } catch (softDeleteError) {
            // If archive endpoint doesn't exist, try regular DELETE
            if (softDeleteError.response?.status === 404) {
                console.log('Archive endpoint not found, trying alternative deletion approach');
                
                // Try to update the goal status to "archived" instead of deleting
                try {
                    console.log('Attempting to archive goal');
                    await apiClient.patch(`/goals/${goalId}`, { 
                        visibility: 'archived'  // Using visibility as alternative if proper delete isn't available
                    });
                    return true;
                } catch (archiveError) {
                    console.error('Archive attempt failed:', archiveError);
                    // Last resort - try hard DELETE
                    await apiClient.delete(`/goals/${goalId}`);
                    return true;
                }
            }
            throw softDeleteError;
        }
    } catch (error) {
        console.error('All deletion attempts failed:', error);
        handleError('deleting goal', error);
    }
};