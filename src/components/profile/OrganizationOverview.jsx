import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import organizationService from "../../services/organizationService";
import userProfileService from "../../services/userProfileService";

export function OrganizationOverview({ onLeave, showToast, onTransferOwnership }) {
  const { t } = useTranslation();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Load user profile to check permissions
        const profile = await userProfileService.getProfile();
        setUserProfile(profile);

        const data = await organizationService.getCurrentOrganization();
        setOrg(data);
        setEditingName(data?.name || '');
        
        // User can edit if they are admin, superuser, or organization owner (contact email)
        const isAdmin = profile?.role === 'admin' || profile?.isSuperUser === true;
        const isOwner = data?.contactEmail === profile?.email;
        setCanEdit(isAdmin || isOwner);
      } catch (e) {
        // User without org
        console.log("No organization found; user can create one");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await organizationService.createSelfOrganization();
      showToast?.(t("organizationOverview.createSuccess"));
      setOrg(res.organization);
    } catch (e) {
      showToast?.(e?.response?.data?.message || e.message || t("organizationOverview.createError"), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm(t("organizationOverview.confirmLeave"))) return;
    setLeaving(true);
    setLeaveError('');
    try {
      const res = await organizationService.leaveOrganization();
      showToast?.(t("organizationOverview.leaveSuccess"));
      onLeave?.(res.organization);
      setOrg(res.organization);
    } catch (e) {
      const message = e?.response?.data?.message || e.message || t("organizationOverview.leaveError");
      setLeaveError(message);
      showToast?.(message, "error");
    } finally {
      setLeaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!editingName || !editingName.trim()) {
      showToast?.(t("organizationOverview.nameRequired"), 'error');
      return;
    }
    setSaving(true);
    try {
      await organizationService.updateOrganizationSettings({ name: editingName.trim() });
      showToast?.(t("organizationOverview.nameUpdated"));
      const data = await organizationService.getCurrentOrganization();
      setOrg(data);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || t("organizationOverview.nameUpdateError");
      showToast?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">{t("organizationOverview.loading")}</div>
    );
  }

  if (!org) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-700 mb-4">{t("organizationOverview.noOrg")}</p>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg"
        >
          {creating ? t("organizationOverview.creating") : t("organizationOverview.createOrg")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {leaveError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{leaveError}</span>
            <div className="flex items-center gap-2">
              {leaveError.toLowerCase().includes('transfer ownership') && (
                <button
                  type="button"
                  onClick={onTransferOwnership}
                  className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                >
                  {t("organizationOverview.transferOwnership")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setLeaveError('')}
                className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-100"
              >
                {t("organizationOverview.dismiss")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
            {canEdit ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="px-3 py-2 border rounded-md text-gray-900"
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md"
                >
                  {saving ? t("organizationOverview.saving") : t("organizationOverview.save")}
                </button>
              </div>
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{org.name}</h2>
            )}
          <p className="text-sm text-gray-600">Status: {org.status} • Members: {org.memberCount ?? "-"}</p>
          <p className="text-sm text-gray-600">Contact: {org.contactEmail}</p>
        </div>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg"
        >
          {leaving ? t("organizationOverview.leaving") : t("organizationOverview.leaveOrg")}
        </button>
      </div>
    </div>
  );
}
