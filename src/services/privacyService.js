// src/services/privacyService.js
import apiClient from "./apiClient";

class PrivacyService {
    async getPreferences() {
        const res = await apiClient.get("/v1/privacy/preferences");
        return res.data;
    }

    async updatePreferences(preferences) {
        const res = await apiClient.put("/v1/privacy/preferences", preferences);
        return res.data;
    }

    async requestDataExport() {
        const res = await apiClient.post("/v1/privacy/export");
        return res.data;
    }
}

export default new PrivacyService();
