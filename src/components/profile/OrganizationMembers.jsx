import React, { useEffect, useState } from "react";
import organizationService from "../../services/organizationService";

export function OrganizationMembers({ showToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await organizationService.getOrganizationMembers();
        setMembers(rows);
      } catch (e) {
        showToast?.(e?.response?.data?.message || e.message || "Failed to load members", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Members</h3>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-gray-600">Loading...</div>
      ) : members.length === 0 ? (
        <div className="p-4 text-sm text-gray-600">No members found.</div>
      ) : (
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{m.firstName} {m.lastName}</div>
                <div className="text-sm text-gray-600">{m.email}</div>
              </div>
              <div className="text-sm text-gray-600">{m.role}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
