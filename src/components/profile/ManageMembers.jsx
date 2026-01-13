import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaEye, FaUserPlus, FaTimes, FaBullseye, FaThLarge, FaUsers } from "react-icons/fa";
import userProfileService from "../../services/userProfileService";

export function ManageMembers({ showToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teams, setTeams] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  useEffect(() => {
    checkPermissions();
    loadMembers();
    loadTeams();
  }, []);

  const checkPermissions = async () => {
    try {
      const profile = await userProfileService.getProfile();
      setCurrentUserProfile(profile);
      const orgService = await import("../../services/organizationService");
      const org = await orgService.default.getCurrentOrganization();
      
      // User can manage members if they are admin, superuser, or organization owner
      const isAdmin = profile?.role === 'admin' || profile?.isSuperUser === true;
      const isOwner = org?.contactEmail === profile?.email;
      setCanManage(isAdmin || isOwner);
    } catch (e) {
      console.log("Could not check permissions:", e);
      setCanManage(false);
    }
  };

  const loadMembers = async () => {
    try {
      const orgService = await import("../../services/organizationService");
      const data = await orgService.default.getOrganizationMembers();
      // API may return either an array or an object with a members property
      const normalized = Array.isArray(data) ? data : (data?.members || []);
      setMembers(normalized);
    } catch (e) {
      const errorMsg = e?.response?.data?.message || "Failed to load members";
      if (errorMsg.includes("not part of any organization")) {
        showToast?.("You're not part of an organization. Visit the Overview tab to create or join one.", "error");
      } else {
        showToast?.(errorMsg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const teamsService = await import("../../services/teamsService");
      const data = await teamsService.default.getTeams();
      setTeams(data);
    } catch (e) {
      const errorMsg = e?.response?.data?.message || "";
      if (errorMsg.includes("not part of any organization")) {
        // Suppress toast for teams load - members error is enough
        console.log("User not in organization");
      } else {
        console.error("Failed to load teams:", e);
      }
    }
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm("Are you sure you want to remove this user from the organization?")) return;

    try {
      const orgService = await import("../../services/organizationService");
      await orgService.default.removeMember(memberId);
      showToast?.("Member removed successfully");
      loadMembers();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to remove member", "error");
    }
  };

  const handleInviteUser = async (email) => {
    try {
      const orgService = await import("../../services/organizationService");
      const { inviteUrl } = await orgService.default.inviteUser(email);
      showToast?.("Invitation sent successfully");
      return { inviteUrl };
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to send invitation", "error");
      throw e;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">Manage Members/Users</h3>
          {canManage && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              <FaUserPlus /> Invite new user
            </button>
          )}
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-600">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="p-4 text-sm text-gray-600">No members found.</div>
      ) : (
        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {member.firstName} {member.lastName}
                </div>
                <div className="text-sm text-gray-600">{member.email}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Role: {member.role} • Status: {member.status}
                </div>
              </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(member)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="View details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleEditMember(member)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit member"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove member"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {showEditModal && selectedMember && (
        <EditMemberModal
          member={selectedMember}
          teams={teams}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadMembers();
          }}
          showToast={showToast}
        />
      )}

      {showDetailModal && selectedMember && (
        <UserDetailModal
          member={selectedMember}
          teams={teams}
          isAdmin={canManage}
          currentUserProfile={currentUserProfile}
          onClose={() => setShowDetailModal(false)}
          onRefresh={loadMembers}
          showToast={showToast}
        />
      )}

      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteUser}
        />
      )}
    </div>
  );
}

function EditMemberModal({ member, teams, onClose, onSuccess, showToast }) {
  const [firstName, setFirstName] = useState(member.firstName || "");
  const [lastName, setLastName] = useState(member.lastName || "");
  const [role, setRole] = useState(member.role || "user");
  const [selectedTeams, setSelectedTeams] = useState(member.teamIds || []);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    try {
      const orgService = await import("../../services/organizationService");
      await orgService.default.updateMember(member.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        teamIds: selectedTeams,
      });
      showToast?.("Member updated successfully");
      onSuccess();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to update member", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleTeam = (teamId) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Only admins can edit other users' goals and key areas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manage User's Teams
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {teams.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No teams available</div>
              ) : (
                teams.map((team) => (
                  <label
                    key={team.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{team.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserDetailModal({ member, teams, isAdmin, currentUserProfile, onClose, onRefresh, showToast }) {
  const [activeTab, setActiveTab] = useState('teams');
  const [userTeams, setUserTeams] = useState([]);
  const [userGoals, setUserGoals] = useState([]);
  const [userKeyAreas, setUserKeyAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingKeyArea, setEditingKeyArea] = useState(null);

  useEffect(() => {
    loadUserTeams();
    if (activeTab === 'goals') loadUserGoals();
    if (activeTab === 'keyareas') loadUserKeyAreas();
  }, [activeTab]);

  const loadUserTeams = async () => {
    try {
      const teamsService = await import("../../services/teamsService");
      const allTeams = await teamsService.default.getTeams();
      
      // For each team, check if this user is a member by fetching team details
      const memberTeams = [];
      for (const team of allTeams) {
        try {
          const teamDetail = await teamsService.default.getTeam(team.id);
          // Check if user is in the members array
          const isMember = teamDetail.members?.some(m => m.id === member.id);
          if (isMember) {
            memberTeams.push({
              ...teamDetail,
              userRole: teamDetail.members?.find(m => m.id === member.id)?.role
            });
          }
        } catch (e) {
          console.error(`Failed to fetch team ${team.id}:`, e);
        }
      }
      
      setUserTeams(memberTeams);
    } catch (e) {
      console.error("Failed to load user teams:", e);
    }
  };

  const loadUserGoals = async () => {
    setLoading(true);
    try {
      const goalService = await import("../../services/goalService");
      const goals = await goalService.getUserGoals(member.id);
      // Filter to only public goals unless current user is admin
      const filteredGoals = isAdmin 
        ? goals 
        : goals.filter(g => g.visibility === 'public');
      setUserGoals(filteredGoals);
    } catch (e) {
      console.error("Failed to load user goals:", e);
      showToast?.("Failed to load goals", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadUserKeyAreas = async () => {
    setLoading(true);
    try {
      const keyAreaService = await import("../../services/keyAreaService");
      const keyAreas = await keyAreaService.default.getMemberKeyAreas(member.id);
      setUserKeyAreas(keyAreas);
    } catch (e) {
      console.error("Failed to load user key areas:", e);
      showToast?.("Failed to load key areas", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (goalId, updates) => {
    if (!isAdmin) {
      showToast?.("Only admins can edit user goals", "error");
      return;
    }

    try {
      const goalService = await import("../../services/goalService");
      await goalService.updateGoal(goalId, updates);
      showToast?.("Goal updated successfully");
      setEditingGoal(null);
      loadUserGoals();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to update goal", "error");
    }
  };

  const handleUpdateKeyArea = async (keyAreaId, updates) => {
    if (!isAdmin) {
      showToast?.("Only admins can edit user key areas", "error");
      return;
    }

    try {
      const keyAreaService = await import("../../services/keyAreaService");
      await keyAreaService.default.update(keyAreaId, updates);
      showToast?.("Key area updated successfully");
      setEditingKeyArea(null);
      loadUserKeyAreas();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to update key area", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {member.firstName} {member.lastName}
            </h3>
            <p className="text-sm text-gray-600">{member.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'teams'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaUsers /> Teams
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'goals'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaBullseye /> Goals {!isAdmin && '(Public Only)'}
            </button>
            <button
              onClick={() => setActiveTab('keyareas')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'keyareas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaThLarge /> Key Areas
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'teams' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Team Memberships</h4>
                <span className="text-xs text-gray-500">{userTeams.length} team(s)</span>
              </div>
              {userTeams.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  This user is not a member of any teams
                </p>
              ) : (
                <div className="space-y-2">
                  {userTeams.map(team => (
                    <div
                      key={team.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{team.name}</h5>
                          <p className="text-sm text-gray-600 mt-1">
                            {team.memberCount || 0} member(s)
                            {team.leadName && ` • Lead: ${team.leadName}`}
                          </p>
                        </div>
                        {team.userRole === 'lead' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Team Lead
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">
                  Goals {!isAdmin && '(Public Only)'}
                </h4>
                <span className="text-xs text-gray-500">{userGoals.length} goal(s)</span>
              </div>
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading goals...</p>
              ) : userGoals.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No {!isAdmin && 'public '}goals found
                </p>
              ) : (
                <div className="space-y-2">
                  {userGoals.map(goal => (
                    <div
                      key={goal.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      {editingGoal === goal.id && isAdmin ? (
                        <EditGoalForm
                          goal={goal}
                          onSave={(updates) => handleUpdateGoal(goal.id, updates)}
                          onCancel={() => setEditingGoal(null)}
                        />
                      ) : (
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{goal.title}</h5>
                              {goal.description && (
                                <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className={`px-2 py-1 rounded-full ${
                                  goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  goal.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {goal.status}
                                </span>
                                {goal.progressPercent !== undefined && (
                                  <span>Progress: {goal.progressPercent}%</span>
                                )}
                                {goal.dueDate && (
                                  <span>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
                                )}
                                <span className={`px-2 py-1 rounded ${
                                  goal.visibility === 'public' 
                                    ? 'bg-blue-50 text-blue-600' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {goal.visibility}
                                </span>
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => setEditingGoal(goal.id)}
                                className="ml-3 p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit goal"
                              >
                                <FaEdit size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isAdmin && (
                <p className="text-xs text-gray-500 italic mt-4">
                  You can only view public goals. Admin access is required to see private goals and make edits.
                </p>
              )}
            </div>
          )}

          {activeTab === 'keyareas' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Key Areas</h4>
                <span className="text-xs text-gray-500">{userKeyAreas.length} key area(s)</span>
              </div>
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading key areas...</p>
              ) : userKeyAreas.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No key areas found</p>
              ) : (
                <div className="space-y-2">
                  {userKeyAreas.map(ka => (
                    <div
                      key={ka.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      {editingKeyArea === ka.id && isAdmin ? (
                        <EditKeyAreaForm
                          keyArea={ka}
                          onSave={(updates) => handleUpdateKeyArea(ka.id, updates)}
                          onCancel={() => setEditingKeyArea(null)}
                        />
                      ) : (
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{ka.title}</h5>
                              {ka.description && (
                                <p className="text-sm text-gray-600 mt-1">{ka.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                {ka.color && (
                                  <span className="flex items-center gap-1">
                                    <span 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: ka.color }}
                                    />
                                    Color
                                  </span>
                                )}
                                {ka.icon && <span>Icon: {ka.icon}</span>}
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => setEditingKeyArea(ka.id)}
                                className="ml-3 p-2 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit key area"
                              >
                                <FaEdit size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isAdmin && (
                <p className="text-xs text-gray-500 italic mt-4">
                  You can only view key areas. Admin access is required to make edits.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditGoalForm({ goal, onSave, onCancel }) {
  const [title, setTitle] = useState(goal.title || '');
  const [description, setDescription] = useState(goal.description || '');
  const [status, setStatus] = useState(goal.status || 'active');
  const [visibility, setVisibility] = useState(goal.visibility || 'public');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, description, status, visibility });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function EditKeyAreaForm({ keyArea, onSave, onCancel }) {
  const [title, setTitle] = useState(keyArea.title || '');
  const [description, setDescription] = useState(keyArea.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function InviteUserModal({ onClose, onInvite }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      const result = await onInvite(email.trim());
      setInviteUrl(result.inviteUrl);
    } catch (e) {
      // Error handled by parent
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
  };

  return (
    // Center the invite modal and add a subtle grayed backdrop that closes the modal when clicked.
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-2xl max-w-md w-[min(600px,90%)] overflow-visible flex flex-col z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Invite New User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        {!inviteUrl ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg"
              >
                {sending ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Invitation sent successfully!</p>
                <p className="text-xs text-green-700 mt-1">An email with the invitation link has been sent to the user.</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Invitation link (optional to share manually):</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
