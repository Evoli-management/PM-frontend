import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaEye, FaUserPlus, FaTimes } from "react-icons/fa";

export function ManageMembers({ showToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadMembers();
    loadTeams();
  }, []);

  const loadMembers = async () => {
    try {
      const orgService = await import("../../services/organizationService");
      const data = await orgService.default.getOrganizationMembers();
      setMembers(data);
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
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <FaUserPlus /> Invite new user
        </button>
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
              <div className="flex items-center gap-2">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
            <p className="text-sm text-gray-600">
              Invitation link generated. Share this link with the user:
            </p>
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
