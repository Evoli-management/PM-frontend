import React, { useEffect, useState } from "react";
import organizationService from "../../services/organizationService";

export function OrganizationInvitations({ showToast }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    try {
      const rows = await organizationService.listInvitations();
      setInvites(rows);
    } catch (e) {
      showToast?.(e?.response?.data?.message || e.message || "Failed to load invitations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (token) => {
    if (!confirm("Cancel this invitation?")) return;
    setCancelling(token);
    try {
      await organizationService.cancelInvitation(token);
      showToast?.("Invitation cancelled");
      await load();
    } catch (e) {
      showToast?.(e?.response?.data?.message || e.message || "Failed to cancel", "error");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Invitations</h3>
        <span className="text-sm text-gray-500">{invites.length} total</span>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-gray-600">Loading...</div>
      ) : invites.length === 0 ? (
        <div className="p-4 text-sm text-gray-600">No invitations yet.</div>
      ) : (
        <ul className="divide-y">
          {invites.map((inv) => (
            <li key={inv.id} className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium text-gray-900">{inv.invitedEmail || "(no email specified)"}</div>
                <div className="text-sm text-gray-600">Token: {inv.token}</div>
                <div className="text-xs text-gray-500">Status: {inv.status} • Expires: {inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : "-"}</div>
              </div>
              <button
                onClick={() => handleCancel(inv.token)}
                disabled={cancelling === inv.token || inv.status !== 'pending'}
                className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50"
              >
                {cancelling === inv.token ? "Cancelling..." : inv.status === 'pending' ? "Cancel" : "Processed"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
