import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import organizationService from "../../services/organizationService";

/**
 * Subscription Manager Modal
 * Allows admins/owners to assign subscription manager role
 * Only one subscription manager per organization
 */
export function SubscriptionManagerModal({ members, currentManager, onClose, onSuccess, showToast }) {
  const [selectedMemberId, setSelectedMemberId] = useState(currentManager?.id || "");
  const [saving, setSaving] = useState(false);
  const [loadingCurrentManager, setLoadingCurrentManager] = useState(!currentManager);

  useEffect(() => {
    if (!currentManager) {
      loadCurrentManager();
    }
  }, []);

  const loadCurrentManager = async () => {
    try {
      setLoadingCurrentManager(true);
      const manager = await organizationService.getSubscriptionManager();
      if (manager) {
        setSelectedMemberId(manager.id);
      }
    } catch (error) {
      console.error("Failed to load current manager:", error);
      showToast?.("Failed to load current subscription manager", "error");
    } finally {
      setLoadingCurrentManager(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMemberId) {
      showToast?.("Please select a member to assign as subscription manager", "error");
      return;
    }

    if (selectedMemberId === currentManager?.id) {
      showToast?.("This member is already the subscription manager", "info");
      onClose();
      return;
    }

    setSaving(true);
    try {
      await organizationService.assignSubscriptionManager(selectedMemberId);
      showToast?.("Subscription manager assigned successfully", "success");
      onSuccess?.();
    } catch (error) {
      const errorMsg = error?.response?.data?.message || "Failed to assign subscription manager";
      showToast?.(errorMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Assign Subscription Manager</h3>
            <p className="text-xs text-gray-500 mt-1">
              The subscription manager can view billing information and manage payment methods.
              Only one member can have this role at a time.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        {loadingCurrentManager ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Manager Display */}
            {currentManager && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">Current Subscription Manager</p>
                <p className="text-sm text-blue-800 font-medium">
                  {currentManager.firstName} {currentManager.lastName}
                </p>
                <p className="text-xs text-blue-700">{currentManager.email}</p>
              </div>
            )}

            {/* Member Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Member
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              >
                <option value="">Select a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} ({member.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the member who will manage subscriptions and payments
              </p>
            </div>

            {/* Warning Message */}
            {selectedMemberId && selectedMemberId !== currentManager?.id && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  ⚠️ This will remove the subscription manager role from the current manager.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={saving || !selectedMemberId}
              >
                {saving ? "Assigning..." : "Assign Manager"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
