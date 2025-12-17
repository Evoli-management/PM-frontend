import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const teamsService = {
  async getTeams() {
    const response = await axios.get(`${API_URL}/teams`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async getTeam(teamId) {
    const response = await axios.get(`${API_URL}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async createTeam(data) {
    const response = await axios.post(`${API_URL}/teams`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async updateTeam(teamId, data) {
    const response = await axios.patch(`${API_URL}/teams/${teamId}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async deleteTeam(teamId) {
    const response = await axios.delete(`${API_URL}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async getTeamMembers(teamId) {
    const response = await axios.get(`${API_URL}/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async addTeamMember(teamId, userId, role = 'member') {
    const response = await axios.post(
      `${API_URL}/teams/${teamId}/members`,
      { userId, role },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }
    );
    return response.data;
  },

  async removeTeamMember(teamId, userId) {
    const response = await axios.delete(`${API_URL}/teams/${teamId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  },

  async updateTeamMemberRole(teamId, userId, role) {
    const response = await axios.patch(
      `${API_URL}/teams/${teamId}/members/${userId}`,
      { role },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }
    );
    return response.data;
  },
};

export default teamsService;
