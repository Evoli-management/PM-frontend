// src/services/goalService.js
import apiClient from "./apiClient";

class GoalService {
    async getGoals(filters) {
        const params = new URLSearchParams();

        if (filters?.status) params.append("status", filters.status);
        if (filters?.keyAreaId) params.append("keyAreaId", filters.keyAreaId);
        if (filters?.includeSubGoalCount) params.append("includeSubGoalCount", "true");
        if (filters?.includeKeyAreaName) params.append("includeKeyAreaName", "true");
        if (filters?.includeMilestoneCount) params.append("includeMilestoneCount", "true");

        const response = await apiClient.get(`/goals?${params.toString()}`);
        return response.data;
    }

    async getGoalById(id, includeKeyAreaName = false) {
        const params = includeKeyAreaName ? "?includeKeyAreaName=true" : "";
        const response = await apiClient.get(`/goals/${id}${params}`);
        return response.data;
    }

    async createGoal(goalData) {
        const response = await apiClient.post("/goals", goalData);
        return response.data;
    }

    async updateGoal(id, goalData) {
        const response = await apiClient.put(`/goals/${id}`, goalData);
        return response.data;
    }

    async deleteGoal(id) {
        const response = await apiClient.delete(`/goals/${id}`);
        return response.data;
    }

    async getGoalsSummary() {
        const response = await apiClient.get("/goals/summary");
        return response.data;
    }

    async getKeyAreas() {
        const response = await apiClient.get("/key-areas");
        return response.data;
    }
}

export default new GoalService();
