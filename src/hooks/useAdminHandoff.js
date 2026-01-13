// src/hooks/useAdminHandoff.js
import { useState } from 'react';
import organizationService from '../services/organizationService';

export const useAdminHandoff = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);

  /**
   * Load organization members for role selection
   */
  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await organizationService.getOrganizationMembers();
      setMembers(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load members';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Promote a user to admin
   */
  const promoteToAdmin = async (memberId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await organizationService.updateMemberRole(memberId, 'admin');
      // Reload members to get updated state
      await loadMembers();
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to promote user';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Leave organization
   */
  const leaveOrganization = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await organizationService.leaveOrganization();
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to leave organization';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loadMembers,
    promoteToAdmin,
    leaveOrganization,
    members,
    loading,
    error,
    setError,
  };
};
