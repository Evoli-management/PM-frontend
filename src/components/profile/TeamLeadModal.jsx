import React, { useEffect, useState } from "react";
import { FaTimes, FaKey } from "react-icons/fa";

/**
 * Modal for assigning team lead to a team
 */
export function TeamLeadModal({ team, teamMembers, onClose, onSuccess, showToast }) {
  const [selectedLeadId, setSelectedLeadId] = useState(team?.teamLeadUserId || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load current team lead
    const loadTeamLead = async () => {
      try {
        const teamsService = await import("../../services/teamsService");
        const lead = await teamsService.default.getTeamLead(team.id);
        if (lead) {
          setSelectedLeadId(lead.id);
        }
      } catch (error) {
        console.log("Could not load team lead:", error);
      }
    };

    if (team?.id) {
      loadTeamLead();
    }
  }, [team]);

  const handleAssignLead = async () => {
    if (!selectedLeadId) {
      showToast?.("Please select a team lead", "error");
      return;
    }

    // Check if selected user is a team member
    const isMember = teamMembers?.some(m => m.id === selectedLeadId);
    if (!isMember) {
      showToast?.("Team lead must be a team member", "error");
      return;
    }

    setIsLoading(true);
    try {
      const teamsService = await import("../../services/teamsService");
      await teamsService.default.assignTeamLead(team.id, selectedLeadId);
      showToast?.("Team lead assigned successfully", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMsg = error?.response?.data?.message || "Failed to assign team lead";
      showToast?.(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white">
          <div className="flex items-center gap-2">
            <FaKey className="text-amber-600" />
            <h2 className="text-lg font-semibold">Assign Team Lead</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Close"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team: <span className="font-semibold">{team?.name}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Team Lead
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">-- Select a team member --</option>
              {teamMembers?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                  {member.id === team?.teamLeadUserId && " (current lead)"}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Team Lead Role:</strong> Can edit team details, manage team members, and access team-specific reports.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignLead}
              disabled={isLoading || !selectedLeadId}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium"
            >
              {isLoading ? "Assigning..." : "Assign Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
