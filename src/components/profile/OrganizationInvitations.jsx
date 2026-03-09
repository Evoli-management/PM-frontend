import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import organizationService from "../../services/organizationService";
import userProfileService from "../../services/userProfileService";

export function OrganizationInvitations({ showToast }) {
  const { t } = useTranslation();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [canManage, setCanManage] = useState(false);

  const load = async () => {
    try {
      const rows = await organizationService.listInvitations();
      setInvites(rows);
    } catch (e) {
      showToast?.(e?.response?.data?.message || e.message || t("organizationInvitations.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const profile = await userProfileService.getProfile();
      const org = await organizationService.getCurrentOrganization();
      
      // User can manage invitations if they are admin, superuser, or organization owner
      const isAdmin = profile?.role === 'admin' || profile?.isSuperUser === true;
      const isOwner = org?.contactEmail === profile?.email;
      setCanManage(isAdmin || isOwner);
    } catch (e) {
      console.log("Could not check permissions:", e);
      setCanManage(false);
    }
  };

  useEffect(() => {
    checkPermissions();
    load();
  }, []);

  const handleCancel = async (token) => {
    if (!confirm(t("organizationInvitations.confirmCancel"))) return;
    setCancelling(token);
    try {
      await organizationService.cancelInvitation(token);
      showToast?.(t("organizationInvitations.cancelSuccess"));
      await load();
    } catch (e) {
      showToast?.(e?.response?.data?.message || e.message || t("organizationInvitations.cancelError"), "error");
    } finally {
      setCancelling(null);
    }
  };

    if (!canManage) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600">{t("organizationInvitations.noPermission")}</p>
        </div>
      );
    }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("organizationInvitations.title")}</h3>
        <span className="text-sm text-gray-500">{t("organizationInvitations.total", { count: invites.length })}</span>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-gray-600">{t("organizationInvitations.loading")}</div>
      ) : invites.length === 0 ? (
        <div className="p-4 text-sm text-gray-600">{t("organizationInvitations.noInvitations")}</div>
      ) : (
        <ul className="divide-y">
          {invites.map((inv) => (
            <li key={inv.id} className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium text-gray-900">{inv.invitedEmail || t("organizationInvitations.noEmail")}</div>
                <div className="text-sm text-gray-600">{t("organizationInvitations.token")} {inv.token}</div>
                <div className="text-xs text-gray-500">{t("organizationInvitations.statusLabel")} {inv.status} • {t("organizationInvitations.expires")} {inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : "-"}</div>
              </div>
              <button
                onClick={() => handleCancel(inv.token)}
                disabled={cancelling === inv.token || inv.status !== 'pending'}
                className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50"
              >
                {cancelling === inv.token ? t("organizationInvitations.cancelling") : inv.status === 'pending' ? t("organizationInvitations.cancel") : t("organizationInvitations.processed")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
