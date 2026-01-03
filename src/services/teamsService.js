import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const teamsService = {
  async getTeams() {
    const response = await axios.get(`${API_URL}/teams`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getTeam(teamId) {
    const response = await axios.get(`${API_URL}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getTeamDashboard(teamId) {
    const response = await axios.get(`${API_URL}/teams/${teamId}/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async createTeam(data) {
    const response = await axios.post(`${API_URL}/teams`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async updateTeam(teamId, data) {
    const response = await axios.patch(`${API_URL}/teams/${teamId}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async deleteTeam(teamId) {
    const response = await axios.delete(`${API_URL}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getTeamMembers(teamId) {
    const response = await axios.get(`${API_URL}/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async addTeamMember(teamId, userId, role = 'member') {
    const response = await axios.post(
      `${API_URL}/teams/${teamId}/members`,
      { userId, role },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  async removeTeamMember(teamId, userId) {
    const response = await axios.delete(`${API_URL}/teams/${teamId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async updateTeamMemberRole(teamId, userId, role) {
    const response = await axios.patch(
      `${API_URL}/teams/${teamId}/members/${userId}`,
      { role },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  // CAN-WILL Reports
  async getOrganizationReport() {
    const response = await axios.get(`${API_URL}/teams/reports/organization`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getMyTeamsReport() {
    const response = await axios.get(`${API_URL}/teams/reports/my-teams`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getMySelfReport() {
    const response = await axios.get(`${API_URL}/teams/reports/myself`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getEmployeeshipMetrics(level, entityId) {
    const params = new URLSearchParams({ level });
    if (entityId) params.append('entityId', entityId);
    
    const response = await axios.get(`${API_URL}/teams/reports/employeeship-metrics?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getPerformanceMetrics(level, entityId) {
    const params = new URLSearchParams({ level });
    if (entityId) params.append('entityId', entityId);
    
    const response = await axios.get(`${API_URL}/teams/reports/performance-metrics?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  // Team Join Request Methods
  async requestJoinTeam(teamId, message) {
    const response = await axios.post(
      `${API_URL}/teams/${teamId}/join-request`,
      { message },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  async getTeamJoinRequests(teamId) {
    const response = await axios.get(`${API_URL}/teams/${teamId}/join-requests`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async reviewJoinRequest(teamId, requestId, action, reason) {
    const response = await axios.patch(
      `${API_URL}/teams/${teamId}/join-requests/${requestId}`,
      { action, reason },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  async cancelJoinRequest(requestId) {
    const response = await axios.delete(`${API_URL}/teams/join-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getMyJoinRequests() {
    const response = await axios.get(`${API_URL}/teams/my-join-requests`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },
};

export default teamsService;
