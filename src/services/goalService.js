// src/services/goalService.js
import apiClient from "./apiClient";
import keyAreaService from "./keyAreaService";

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
        // Map FE -> BE fields as needed: parentId -> parentGoalId, areaId -> keyAreaId
        const payload = {
            title: goalData.title,
            description: goalData.description,
            keyAreaId: goalData.keyAreaId || goalData.areaId,
            parentGoalId: goalData.parentGoalId || goalData.parentId || undefined,
            startDate: goalData.startDate,
            dueDate: goalData.dueDate,
            visibility: goalData.visibility || "public",
            milestones:
                Array.isArray(goalData.milestones) && goalData.milestones.length > 0
                    ? goalData.milestones.map((m) => ({ title: m.title, dueDate: m.dueDate, weight: m.weight }))
                    : [{ title: "Milestone 1", weight: 1.0 }],
        };
        const response = await apiClient.post("/goals", payload);
        return response.data;
    }

    async updateGoal(id, goalData) {
        const payload = {
            title: goalData.title,
            description: goalData.description,
            keyAreaId: goalData.keyAreaId || goalData.areaId,
            parentGoalId: goalData.parentGoalId || goalData.parentId || undefined,
            startDate: goalData.startDate,
            dueDate: goalData.dueDate,
            visibility: goalData.visibility,
            status: goalData.status,
        };
        const response = await apiClient.put(`/goals/${id}`, payload);
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
        // Use unified Key Areas service (returns FE-mapped shape)
        return keyAreaService.list({ includeTaskCount: false });
    }
}

export default new GoalService();
