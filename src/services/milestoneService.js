// src/services/milestoneService.js
import apiClient from "./apiClient";

class MilestoneService {
    async getMilestonesByGoal(goalId) {
        try {
            console.log("Fetching milestones for goal:", goalId);
            // Backend returns milestones via GET /goals/:id
            const response = await apiClient.get(`/goals/${goalId}`);
            const milestones = Array.isArray(response.data?.milestones) ? response.data.milestones : [];
            console.log("Milestones fetched successfully:", milestones);
            return milestones;
        } catch (error) {
            console.error("Error fetching milestones:", error.response?.data || error.message);
            throw error;
        }
    }

    async createMilestone(goalId, milestoneData) {
        try {
            console.log("Creating milestone for goal:", goalId, "Data:", milestoneData);

            // Transform the data to match backend expectations exactly
            const backendData = {
                title: milestoneData.title?.trim(),
                dueDate: milestoneData.dueDate || milestoneData.targetDate || undefined,
                weight: Number(milestoneData.weight) || 1.0,
            };

            // Remove undefined values
            Object.keys(backendData).forEach((key) => {
                if (backendData[key] === undefined) {
                    delete backendData[key];
                }
            });

            console.log("Sending transformed data to backend:", backendData);

            // Backend route: POST /goals/:id/milestones
            const response = await apiClient.post(`/goals/${goalId}/milestones`, backendData);
            console.log("Milestone created successfully:", response.data);
            return response.data;
        } catch (error) {
            console.error("Error creating milestone:", error.response?.data || error.message);
            throw error;
        }
    }

    async updateMilestone(milestoneId, milestoneData) {
        try {
            console.log("Updating milestone:", milestoneId, "Data:", milestoneData);

            // Transform the data to match backend expectations
            const backendData = {
                title: milestoneData.title?.trim(),
                dueDate: milestoneData.dueDate || milestoneData.targetDate || undefined,
                weight: Number(milestoneData.weight) || 1.0,
                done: milestoneData.status === "completed" || milestoneData.done || false,
            };

            // Remove undefined values
            Object.keys(backendData).forEach((key) => {
                if (backendData[key] === undefined) {
                    delete backendData[key];
                }
            });

            console.log("Sending transformed update data:", backendData);

            const response = await apiClient.put(`/milestones/${milestoneId}`, backendData);
            console.log("Milestone updated successfully:", response.data);
            return response.data;
        } catch (error) {
            console.error("Error updating milestone:", error.response?.data || error.message);
            throw error;
        }
    }

    async deleteMilestone(milestoneId) {
        try {
            console.log("Deleting milestone:", milestoneId);
            const response = await apiClient.delete(`/milestones/${milestoneId}`);
            console.log("Milestone deleted successfully");
            return response.data;
        } catch (error) {
            console.error("Error deleting milestone:", milestoneId, error.response?.data || error.message);
            throw error;
        }
    }

    async toggleMilestone(milestoneId, done) {
        try {
            console.log("Toggling milestone:", milestoneId, "Done:", done);
            // Backend forbids setting both done and score simultaneously; send only done.
            const response = await apiClient.put(`/milestones/${milestoneId}`, { done });
            console.log("Milestone toggled successfully:", response.data);
            return response.data;
        } catch (error) {
            console.error("Error toggling milestone:", milestoneId, error.response?.data || error.message);
            throw error;
        }
    }

    // Batch operations for better performance
    async createMultipleMilestones(goalId, milestonesData) {
        try {
            console.log("Creating multiple milestones for goal:", goalId, "Count:", milestonesData.length);

            const createdMilestones = [];
            const errors = [];

            for (const milestoneData of milestonesData) {
                try {
                    const milestone = await this.createMilestone(goalId, milestoneData);
                    createdMilestones.push(milestone);
                } catch (error) {
                    errors.push({
                        milestone: milestoneData.title,
                        error: error.response?.data?.message || error.message,
                    });
                }
            }

            if (errors.length > 0) {
                console.warn("Some milestones failed to create:", errors);
            }

            return {
                created: createdMilestones,
                errors: errors,
                success: createdMilestones.length,
                failed: errors.length,
            };
        } catch (error) {
            console.error("Error in batch milestone creation:", error);
            throw error;
        }
    }
}

export default new MilestoneService();
