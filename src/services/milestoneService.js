// src/services/milestoneService.js
import apiClient from "./apiClient";

class MilestoneService {
    async getMilestonesByGoal(goalId) {
        try {
            console.log('Fetching milestones for goal:', goalId);
            const response = await apiClient.get(`/milestones/goals/${goalId}`);
            console.log('Milestones fetched successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching milestones:', error.response?.data || error.message);
            throw error;
        }
    }

    async createMilestone(goalId, milestoneData) {
        try {
            console.log('Creating milestone for goal:', goalId, 'Data:', milestoneData);
            
            // Transform the data to match backend expectations exactly
            const backendData = {
                title: milestoneData.title?.trim(),
                description: milestoneData.description?.trim() || undefined,
                dueDate: milestoneData.dueDate || milestoneData.targetDate || undefined, // Handle both field names
                weight: Number(milestoneData.weight) || 1.0,
                sortOrder: Number(milestoneData.sortOrder) || 0
            };
            
            // Remove undefined values
            Object.keys(backendData).forEach(key => {
                if (backendData[key] === undefined) {
                    delete backendData[key];
                }
            });
            
            console.log('Sending transformed data to backend:', backendData);
            
            const response = await apiClient.post(`/milestones/goals/${goalId}`, backendData);
            console.log('Milestone created successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error creating milestone:', error.response?.data || error.message);
            throw error;
        }
    }

    async updateMilestone(milestoneId, milestoneData) {
        try {
            console.log('Updating milestone:', milestoneId, 'Data:', milestoneData);
            
            // Transform the data to match backend expectations
            const backendData = {
                title: milestoneData.title?.trim(),
                description: milestoneData.description?.trim() || undefined,
                dueDate: milestoneData.dueDate || milestoneData.targetDate || undefined,
                weight: Number(milestoneData.weight) || 1.0,
                done: milestoneData.status === 'completed' || milestoneData.done || false,
                sortOrder: Number(milestoneData.sortOrder) || 0
            };
            
            // Remove undefined values
            Object.keys(backendData).forEach(key => {
                if (backendData[key] === undefined) {
                    delete backendData[key];
                }
            });
            
            console.log('Sending transformed update data:', backendData);
            
            const response = await apiClient.put(`/milestones/${milestoneId}`, backendData);
            console.log('Milestone updated successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error updating milestone:', error.response?.data || error.message);
            throw error;
        }
    }

    async deleteMilestone(milestoneId) {
        try {
            console.log('Deleting milestone:', milestoneId);
            const response = await apiClient.delete(`/milestones/${milestoneId}`);
            console.log('Milestone deleted successfully');
            return response.data;
        } catch (error) {
            console.error('Error deleting milestone:', milestoneId, error.response?.data || error.message);
            throw error;
        }
    }

    async toggleMilestone(milestoneId, done) {
        try {
            console.log('Toggling milestone:', milestoneId, 'Done:', done);
            const response = await apiClient.put(`/milestones/${milestoneId}`, { 
                done,
                score: done ? 1.0 : 0.0 // Set score based on completion status
            });
            console.log('Milestone toggled successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error toggling milestone:', milestoneId, error.response?.data || error.message);
            throw error;
        }
    }

    // Batch operations for better performance
    async createMultipleMilestones(goalId, milestonesData) {
        try {
            console.log('Creating multiple milestones for goal:', goalId, 'Count:', milestonesData.length);
            
            const createdMilestones = [];
            const errors = [];
            
            for (const milestoneData of milestonesData) {
                try {
                    const milestone = await this.createMilestone(goalId, milestoneData);
                    createdMilestones.push(milestone);
                } catch (error) {
                    errors.push({
                        milestone: milestoneData.title,
                        error: error.response?.data?.message || error.message
                    });
                }
            }
            
            if (errors.length > 0) {
                console.warn('Some milestones failed to create:', errors);
            }
            
            return {
                created: createdMilestones,
                errors: errors,
                success: createdMilestones.length,
                failed: errors.length
            };
        } catch (error) {
            console.error('Error in batch milestone creation:', error);
            throw error;
        }
    }
}

export default new MilestoneService();