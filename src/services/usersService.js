// Minimal users service to power dropdowns for assignee selection.
// Currently uses /users/me to get the authenticated user; can expand to team list later.
import apiClient from "./apiClient";
import organizationService from "./organizationService";
import userProfileService from "./userProfileService";

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
        // If the requested user is the current user, use /user/profile for richer data
        try {
            const profile = await userProfileService.getProfile();
            if (profile?.id === userId) {
                return profile;
            }
        } catch {}

        // Primary: resolve from organization members list
        try {
            const members = await organizationService.getOrganizationMembers();
            const found = (Array.isArray(members) ? members : []).find(
                (m) => m.id === userId || m.userId === userId
            );
            if (found) return found;
        } catch {}

        // Fallback: try /users/me if matches
        try {
            const res = await apiClient.get("/users/me");
            const u = res?.data?.user;
            if (u && (u.id === userId || u.sub === userId || u.email === userId)) {
                return {
                    id: u.id || u.sub || u.email,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email || "",
                };
            }
        } catch {}

        // Last resort: return a minimal stub to avoid hard failures in UI
        return { id: userId, firstName: "User", lastName: "", email: "" };
    },
};

export default usersService;
