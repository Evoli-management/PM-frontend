import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FaTimes } from "react-icons/fa";
import organizationService from "../../services/organizationService";

/**
 * Subscription Manager Modal
 * Allows admins/owners to assign subscription manager role
 * Only one subscription manager per organization
 */
export function SubscriptionManagerModal({ members, currentManager, onClose, onSuccess, showToast }) {
  const { t } = useTranslation();
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
      showToast?.(t("subscriptionManagerModal.loadError"), "error");
    } finally {
      setLoadingCurrentManager(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMemberId) {
      showToast?.(t("subscriptionManagerModal.selectRequired"), "error");
      return;
    }

    if (selectedMemberId === currentManager?.id) {
      showToast?.(t("subscriptionManagerModal.alreadyManager"), "info");
      onClose();
      return;
    }

    setSaving(true);
    try {
      await organizationService.assignSubscriptionManager(selectedMemberId);
      showToast?.(t("subscriptionManagerModal.assignSuccess"), "success");
      onSuccess?.();
    } catch (error) {
      const errorMsg = error?.response?.data?.message || t("subscriptionManagerModal.assignError");
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
            <h3 className="text-lg font-semibold">{t("subscriptionManagerModal.title")}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {t("subscriptionManagerModal.description")}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        {loadingCurrentManager ? (
          <div className="py-8 text-center text-gray-500">{t("subscriptionManagerModal.loading")}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Manager Display */}
            {currentManager && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">{t("subscriptionManagerModal.currentManager")}</p>
                <p className="text-sm text-blue-800 font-medium">
                  {currentManager.firstName} {currentManager.lastName}
                </p>
                <p className="text-xs text-blue-700">{currentManager.email}</p>
              </div>
            )}

            {/* Member Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("subscriptionManagerModal.assignToMember")}
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              >
                <option value="">{t("subscriptionManagerModal.selectMember")}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} ({member.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {t("subscriptionManagerModal.selectHint")}
              </p>
            </div>

            {/* Warning Message */}
            {selectedMemberId && selectedMemberId !== currentManager?.id && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  ⚠️ {t("subscriptionManagerModal.warning")}
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
                {t("subscriptionManagerModal.cancel")}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={saving || !selectedMemberId}
              >
                {saving ? t("subscriptionManagerModal.assigning") : t("subscriptionManagerModal.assignManager")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
