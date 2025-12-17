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
}

export default new OrganizationService();
