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
};

export default usersService;
