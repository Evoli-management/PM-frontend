// Minimal users service to power dropdowns for assignee selection.
// Currently uses /users/me to get the authenticated user; can expand to team list later.
import apiClient from "./apiClient";

const usersService = {
    async list() {
        try {
            const res = await apiClient.get("/users/me");
            const u = res?.data?.user;
            if (!u) return [];
            const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Me";
            return [{ id: u.id || u.sub || u.email || "me", name, email: u.email || "" }];
        } catch {
            return [];
        }
    },

    async getUser(userId) {
        if (!userId) return null;
        // Try dedicated endpoint first if available
        try {
            const res = await apiClient.get(`/organizations/current/members/${userId}`);
            return res.data;
        } catch (err) {
            // Fallback: list all members and find by id
            try {
                const listRes = await apiClient.get("/organizations/current/members");
                const members = Array.isArray(listRes.data) ? listRes.data : [];
                const found = members.find(m => m.id === userId || m.userId === userId);
                if (found) return found;
            } catch {}
            // As a last resort, return a minimal stub
            return { id: userId, firstName: "User", lastName: "", email: "" };
        }
    },
};

export default usersService;
