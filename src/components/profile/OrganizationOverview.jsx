import React, { useEffect, useState } from "react";
import organizationService from "../../services/organizationService";

export function OrganizationOverview({ onLeave, showToast }) {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await organizationService.getCurrentOrganization();
        setOrg(data);
        setEditingName(data?.name || '');
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
      showToast?.("Organization created successfully");
      setOrg(res.organization);
    } catch (e) {
      showToast?.(e?.response?.data?.message || e.message || "Failed to create organization", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this organization and create your own?")) return;
    setLeaving(true);
    try {
      const res = await organizationService.leaveOrganization();
      showToast?.("Left organization successfully");
      onLeave?.(res.organization);
      setOrg(res.organization);
    } catch (e) {
      showToast?.(e?.response?.data?.message || e.message || "Failed to leave organization", "error");
    } finally {
      setLeaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!editingName || !editingName.trim()) {
      showToast?.('Please enter a valid organization name', 'error');
      return;
    }
    setSaving(true);
    try {
      await organizationService.updateOrganizationSettings({ name: editingName.trim() });
      showToast?.('Organization name updated');
      const data = await organizationService.getCurrentOrganization();
      setOrg(data);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to update organization name';
      showToast?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">Loading organization...</div>
    );
  }

  if (!org) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-700 mb-4">You don't have an organization yet.</p>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg"
        >
          {creating ? "Creating..." : "Create my organization"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
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
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-sm text-gray-600">Status: {org.status} • Members: {org.memberCount ?? "-"}</p>
          <p className="text-sm text-gray-600">Contact: {org.contactEmail}</p>
        </div>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg"
        >
          {leaving ? "Leaving..." : "Leave Organization"}
        </button>
      </div>
    </div>
  );
}
