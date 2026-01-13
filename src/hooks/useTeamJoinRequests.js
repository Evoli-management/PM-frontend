// src/hooks/useTeamJoinRequests.js
import { useState } from 'react';
import teamsService from '../services/teamsService';

export const useTeamJoinRequests = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Request to join a team
   */
  const requestJoinTeam = async (teamId, message = '') => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamsService.requestJoinTeam(teamId, message);
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send join request';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get pending join requests for a team (team lead/admin only)
   */
  const getPendingRequests = async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamsService.getTeamJoinRequests(teamId);
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch join requests';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Approve or reject a join request
   */
  const reviewRequest = async (teamId, requestId, action, reason = '') => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamsService.reviewJoinRequest(teamId, requestId, action, reason);
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || `Failed to ${action} request`;
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel a join request
   */
  const cancelRequest = async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamsService.cancelJoinRequest(requestId);
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to cancel request';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get user's pending join requests
   */
  const getMyRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamsService.getMyJoinRequests();
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch your requests';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    requestJoinTeam,
    getPendingRequests,
    reviewRequest,
    cancelRequest,
    getMyRequests,
    loading,
    error,
    setError,
  };
};
