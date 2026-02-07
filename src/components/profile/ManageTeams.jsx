import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaKey } from "react-icons/fa";
import userProfileService from "../../services/userProfileService";
import { TeamLeadModal } from "./TeamLeadModal";

export function ManageTeams({ showToast }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTeamLeadModal, setShowTeamLeadModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [usage, setUsage] = useState(null); // Plan usage and limits

  useEffect(() => {
    checkPermissions();
    loadTeams();
    loadOrgMembers();
    loadUsage();
  }, []);

  const checkPermissions = async () => {
    try {
      // All authenticated users (members, admins, owners) can create teams
      // Backend only requires authentication, no role-based restrictions
      setCanManage(true);
    } catch (e) {
      console.log("Could not check permissions:", e);
      setCanManage(false);
    }
  };

  const loadUsage = async () => {
    try {
      const orgService = await import("../../services/organizationService");
      const usageData = await orgService.default.getCurrentUsage();
      setUsage(usageData);
    } catch (error) {
      console.log("Could not load usage:", error);
    }
  };

  const loadTeams = async () => {
    try {
      // TODO: Implement teams API
      const teamsService = await import("../../services/teamsService");
      const data = await teamsService.default.getTeams();
      setTeams(data);
    } catch (e) {
      const errorMsg = e?.response?.data?.message || "";
      if (errorMsg.includes("not part of any organization")) {
        showToast?.("You're not part of an organization. Visit the Overview tab to create or join one.", "error");
      } else {
        console.error("Failed to load teams:", e);
      }
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgMembers = async () => {
    try {
      const orgService = await import("../../services/organizationService");
      const data = await orgService.default.getOrganizationMembers();
      setMembers(data);
    } catch (e) {
      const errorMsg = e?.response?.data?.message || "";
      if (errorMsg.includes("not part of any organization")) {
        // Suppress toast - teams error is enough
        console.log("User not in organization");
      } else {
        console.error("Failed to load members:", e);
      }
    }
  };

  const handleCreateTeam = () => {
    if (usage && !usage.canAddTeams) {
      showToast?.(`Cannot create team: You have ${usage.currentTeams} team(s) but ${usage.planName} plan allows only ${usage.maxTeams}. Upgrade your plan to add more teams.`, 'error');
      return;
    }
    setSelectedTeam(null);
    setShowCreateModal(true);
  };

  const handleEditTeam = (team) => {
    setSelectedTeam(team);
    setShowEditModal(true);
  };

  const handleAssignTeamLead = async (team) => {
    setSelectedTeam(team);
    
    // Load team members
    try {
      const teamsService = await import("../../services/teamsService");
      const teamData = await teamsService.default.getTeamMembers(team.id);
      // API may return array or object with members property
      const membersList = Array.isArray(teamData) ? teamData : (teamData?.members || []);
      setSelectedTeamMembers(membersList);
    } catch (error) {
      showToast?.("Failed to load team members", "error");
      return;
    }

    setShowTeamLeadModal(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    
    try {
      const teamsService = await import("../../services/teamsService");
      await teamsService.default.deleteTeam(teamId);
      showToast?.("Team deleted successfully");
      loadTeams();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to delete team", "error");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Manage Teams</h3>
          {canManage && (
            <button
              onClick={handleCreateTeam}
              disabled={usage && !usage.canAddTeams}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm"
              title={usage && !usage.canAddTeams ? `Team limit reached (${usage.currentTeams}/${usage.maxTeams} on ${usage.planName} plan). Upgrade to add more teams.` : "Create a new team"}
            >
              <FaPlus /> Create new team
            </button>
          )}
        </div>

        {/* Usage Stats */}
        {usage && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-700">
                <strong>{usage.currentMembers}</strong> / {usage.maxMembers} members
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-700">
                <strong>{usage.currentTeams}</strong> / {usage.maxTeams} teams
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded-full font-medium">
                {usage.planName} plan
              </span>
            </div>
            {!usage.canAddTeams && (
              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Team limit reached
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-600">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="p-4 text-sm text-gray-600">
          No teams found. Create your first team to get started.
        </div>
      ) : (
        <div className="divide-y">
          {teams.map((team) => (
            <div key={team.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  {team.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Members: {team.memberCount || 0}
                  {team.teamLeadName && (
                    <span className="ml-3 inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                      Lead: {team.teamLeadName}
                    </span>
                  )}
                </div>
              </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAssignTeamLead(team)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded"
                      title="Assign team lead"
                    >
                      <FaKey />
                    </button>
                    <button
                      onClick={() => handleEditTeam(team)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit team"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete team"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTeams();
            loadUsage();
          }}
          showToast={showToast}
          members={members}
        />
      )}

      {showEditModal && selectedTeam && (
        <EditTeamModal
          team={selectedTeam}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadTeams();
          }}
          showToast={showToast}
          members={members}
        />
      )}

      {showTeamLeadModal && selectedTeam && (
        <TeamLeadModal
          team={selectedTeam}
          teamMembers={selectedTeamMembers}
          onClose={() => setShowTeamLeadModal(false)}
          onSuccess={() => {
            setShowTeamLeadModal(false);
            loadTeams();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function CreateTeamModal({ onClose, onSuccess, showToast, members }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leadId, setLeadId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast?.("Team name is required", "error");
      return;
    }

    setSaving(true);
    try {
      const teamsService = await import("../../services/teamsService");
      const memberIds = Array.from(
        new Set([
          ...selectedMembers,
          ...(leadId ? [leadId] : []),
        ])
      );

      await teamsService.default.createTeam({
        name: name.trim(),
        description: description.trim(),
        leadId: leadId || undefined,
        memberIds: memberIds.length > 0 ? memberIds : undefined,
      });
      
      showToast?.("Team created successfully");
      onSuccess();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to create team", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    // Center the modal in the viewport and add a subtle grayed backdrop that closes
    // the modal when clicked. Modal content stops propagation so clicks inside do not close it.
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-[min(1100px,90%)] overflow-visible flex flex-col z-10 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create New Team</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., CMC, Sales and Marketing"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Team description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Leader
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select team leader...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Members
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {members.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                  <input
                    type="checkbox"
                      checked={isSelected}
                    onChange={() => toggleMember(member.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                    <span className="text-sm flex-1">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {isSelected ? 'Selected' : 'Not selected'}
                    </span>
                  </label>
                );
              })}
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
              {saving ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTeamModal({ team, onClose, onSuccess, showToast, members }) {
  const [name, setName] = useState(team.name || "");
  const [description, setDescription] = useState(team.description || "");
  const [leadId, setLeadId] = useState(team.leadId || team.teamLeadUserId || "");
  const [selectedMembers, setSelectedMembers] = useState(
    team.memberIds || team.members?.map((m) => m.id) || []
  );
  const [saving, setSaving] = useState(false);

  const currentMemberIds = new Set(
    (team.members?.map((m) => m.id) || team.memberIds || []).filter(Boolean)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast?.("Team name is required", "error");
      return;
    }

    setSaving(true);
    try {
      const teamsService = await import("../../services/teamsService");
      
      // Update team basic info (only name and description)
      await teamsService.default.updateTeam(team.id, {
        name: name.trim(),
        description: description.trim(),
      });
      
      // Get current members
      const currentMembers = team.members?.map(m => m.id) || [];
      const currentLeadId = team.leadId || team.teamLeadUserId || "";
      const newMembers = selectedMembers;
      
      // Remove members that were deselected
      for (const memberId of currentMembers) {
        if (!newMembers.includes(memberId)) {
          await teamsService.default.removeTeamMember(team.id, memberId);
        }
      }
      
      // Add new members
      for (const memberId of newMembers) {
        if (!currentMembers.includes(memberId)) {
          await teamsService.default.addTeamMember(team.id, memberId, 'member');
        }
      }

      if (leadId) {
        if (!newMembers.includes(leadId) && !currentMembers.includes(leadId)) {
          await teamsService.default.addTeamMember(team.id, leadId, 'member');
        }

        if (leadId !== currentLeadId) {
          await teamsService.default.assignTeamLead(team.id, leadId);
        }
      }
      
      showToast?.("Team updated successfully");
      onSuccess();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to update team", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    // Center the edit modal in the viewport and add a subtle grayed backdrop that closes
    // the modal when clicked. Modal content stops propagation so clicks inside do not close it.
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-[min(1100px,90%)] overflow-visible flex flex-col z-10 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Team</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Leader
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select team leader...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Members
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {members.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                const isCurrent = currentMemberIds.has(member.id);
                return (
                  <label
                    key={member.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                  <input
                    type="checkbox"
                      checked={isSelected}
                    onChange={() => toggleMember(member.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                    <span className="text-sm flex-1">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${isCurrent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {isCurrent ? 'In team' : 'Not in team'}
                    </span>
                  </label>
                );
              })}
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
