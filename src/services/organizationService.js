// src/services/organizationService.js
import apiClient from "./apiClient";

class OrganizationService {
  /**
   * Get current user's organization details
   */
  async getCurrentOrganization() {
    try {
      const res = await apiClient.get("/organizations/current");
      return res.data;
    } catch (error) {
      console.error("Failed to fetch organization:", error);
      throw error;
    }
  }

  /**
   * Get all organizations for current user
   */
  async getUserOrganizations() {
    try {
      const res = await apiClient.get("/organizations");
      return res.data || [];
    } catch (error) {
      console.error("Failed to fetch user organizations:", error);
      throw error;
    }
  }

  /**
   * Get all members in current organization
   */
  async getOrganizationMembers() {
    try {
      const res = await apiClient.get("/organizations/current/members");
      return res.data || [];
    } catch (error) {
      console.error("Failed to fetch organization members:", error);
      throw error;
    }
  }

  /**
   * Invite user to organization by email
   * @param {string} email - Email address to invite
   * @returns {Promise<{token: string, inviteUrl: string}>}
   */
  async inviteUser(email) {
    try {
      if (!email || !email.trim()) {
        throw new Error("Email is required");
      }
      const res = await apiClient.post("/organizations/current/invite", {
        email: email.trim().toLowerCase(),
      });
      return res.data;
    } catch (error) {
      console.error("Failed to invite user:", error);
      throw error;
    }
  }

  /**
   * List invitations for current organization
   */
  async listInvitations() {
    try {
      const res = await apiClient.get("/organizations/current/invitations");
      return res.data || [];
    } catch (error) {
      console.error("Failed to list invitations:", error);
      throw error;
    }
  }

  /**
   * Cancel an invitation by token
   * @param {string} token
   */
  async cancelInvitation(token) {
    try {
      const res = await apiClient.post(`/organizations/invitations/${token}/cancel`);
      return res.data;
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
      throw error;
    }
  }

  /**
   * Get invitation details from token (public, no auth required)
   * @param {string} token - Invitation token from URL
   */
  async getInvitationInfo(token) {
    try {
      if (!token) {
        throw new Error("Token is required");
      }
      const res = await apiClient.get(`/organizations/invitations/${token}`);
      return res.data;
    } catch (error) {
      console.error("Failed to fetch invitation info:", error);
      throw error;
    }
  }

  /**
   * Accept invitation and join organization
   * @param {string} token - Invitation token
   */
  async acceptInvitation(token) {
    try {
      if (!token) {
        throw new Error("Token is required");
      }
      const res = await apiClient.post(`/organizations/invitations/${token}/accept`);
      return res.data;
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      throw error;
    }
  }

  /**
   * Create a personal organization for users without one
   */
  async createSelfOrganization() {
    try {
      const res = await apiClient.post("/organizations/create-self");
      return res.data;
    } catch (error) {
      console.error("Failed to create organization:", error);
      throw error;
    }
  }

  /**
   * Leave current organization (creates new single-user org)
   */
  async leaveOrganization() {
    try {
      const res = await apiClient.post("/organizations/leave");
      return res.data;
    } catch (error) {
      console.error("Failed to leave organization:", error);
      throw error;
    }
  }

  /**
   * Update member details
   * @param {string} memberId - User ID
   * @param {object} data - { firstName, lastName, role, teamIds }
   */
  async updateMember(memberId, data) {
    try {
      const res = await apiClient.patch(`/organizations/current/members/${memberId}`, data);
      return res.data;
    } catch (error) {
      console.error("Failed to update member:", error);
      throw error;
    }
  }

  /**
   * Remove member from organization
   * @param {string} memberId - User ID
   */
  async removeMember(memberId) {
    try {
      const res = await apiClient.delete(`/organizations/current/members/${memberId}`);
      return res.data;
    } catch (error) {
      console.error("Failed to remove member:", error);
      throw error;
    }
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings() {
    try {
      const res = await apiClient.get("/organizations/current/settings");
      return res.data;
    } catch (error) {
      console.error("Failed to fetch organization settings:", error);
      throw error;
    }
  }

  /**
   * Update organization settings
   * @param {object} data - Settings data
   */
  async updateOrganizationSettings(data) {
    try {
      const res = await apiClient.patch("/organizations/current/settings", data);
      return res.data;
    } catch (error) {
      console.error("Failed to update organization settings:", error);
      throw error;
    }
  }

  /**
   * Update member role (promote/demote admin) - Admin only
   * @param {string} memberId - User ID to update
   * @param {string} role - New role: 'admin' or 'user'
   */
  async updateMemberRole(memberId, role) {
    try {
      const res = await apiClient.patch(`/organizations/current/members/${memberId}/role`, {
        role,
      });
      return res.data;
    } catch (error) {
      console.error("Failed to update member role:", error);
      throw error;
    }
  }

  /**
   * Leave organization and create new single-user organization
   */
  async leaveOrganization() {
    try {
      const res = await apiClient.post("/organizations/leave");
      return res.data;
    } catch (error) {
      console.error("Failed to leave organization:", error);
      throw error;
    }
  }

  /**
   * Get all organizations for current user
   * Used for organization switcher
   */
  async getUserOrganizations() {
    try {
      const res = await apiClient.get("/organizations/user");
      return res.data || [];
    } catch (error) {
      console.error("Failed to fetch user organizations:", error);
      // Fallback to current organization if endpoint not available
      try {
        const current = await this.getCurrentOrganization();
        return current ? [current] : [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Get current subscription manager for organization
   */
  async getSubscriptionManager() {
    try {
      const res = await apiClient.get("/organizations/current/subscription-manager");
      return res.data?.manager || null;
    } catch (error) {
      console.error("Failed to fetch subscription manager:", error);
      throw error;
    }
  }

  /**
   * Assign subscription manager to a member
   * Only one subscription manager per organization
   * @param {string} memberId - User ID to assign as subscription manager
   */
  async assignSubscriptionManager(memberId) {
    try {
      if (!memberId) {
        throw new Error("Member ID is required");
      }
      const res = await apiClient.patch("/organizations/current/subscription-manager", {
        memberId,
      });
      return res.data;
    } catch (error) {
      console.error("Failed to assign subscription manager:", error);
      throw error;
    }
  }

  /**
   * Get current subscription usage (members and teams count vs limits)
   */
  async getCurrentUsage() {
    try {
      const res = await apiClient.get("/organizations/current/usage");
      return res.data?.usage || null;
    } catch (error) {
      console.error("Failed to fetch usage:", error);
      throw error;
    }
  }
}

export default new OrganizationService();
