import React, { useEffect, useState } from "react";
import organizationService from "../../services/organizationService";

export function OrganizationOverview({ onLeave, showToast }) {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await organizationService.getCurrentOrganization();
        setOrg(data);
      } catch (e) {
        showToast?.(e?.response?.data?.message || e.message || "Failed to load organization", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">Loading organization...</div>
    );
  }

  if (!org) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">No organization found.</div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
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
