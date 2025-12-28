import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { FaBars } from "react-icons/fa";
import teamsService from "../services/teamsService";

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const t = await teamsService.getTeam(teamId);
        const m = await teamsService.getTeamMembers(teamId);
        setTeam(t || null);
        setMembers(m || []);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load team";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId]);

  return (
    <div className="min-h-screen bg-[#EDEDED]">
      <div className="flex w-full min-h-screen">
        <Sidebar 
          user={{ name: "Hussein" }}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <main className="flex-1 min-w-0 w-full min-h-screen transition-all md:ml-[1mm] overflow-y-auto px-1 md:px-2">
          <div className="max-w-full overflow-x-hidden pb-8 min-h-full">
            <div className="flex items-center justify-between gap-4 mb-0 p-0 pb-0">
              <div className="flex items-center gap-4">
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  <FaBars />
                </button>
                <button
                  onClick={() => navigate('/teams')}
                  className="px-3 py-2 text-xs border rounded hover:bg-gray-100"
                >
                  ← Back to Teams
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm sm:p-4 mt-3">
              {loading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Loading team…</p>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">❌</div>
                  <p>{error}</p>
                  <button
                    onClick={() => navigate('/teams')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Go back
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {team?.name?.charAt(0)}
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold text-gray-900">{team?.name}</h1>
                        <p className="text-xs text-gray-600">{members?.length || team?.memberCount || 0} members</p>
                      </div>
                    </div>
                  </header>

                  <section>
                    <h2 className="mb-2 text-[15px] font-semibold text-gray-800">Description</h2>
                    <p className="text-sm text-gray-700">
                      {team?.description || 'No description provided.'}
                    </p>
                  </section>

                  <section>
                    <h2 className="mb-2 text-[15px] font-semibold text-gray-800">Members</h2>
                    {members && members.length > 0 ? (
                      <div className="space-y-2">
                        {members.map((m) => (
                          <MemberRow key={m.id || m.userId} member={m} onView={() => navigate(`/member/${m.id || m.userId}`)} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No members to display.</p>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function MemberRow({ member, onView }) {
  const name = member.firstName ? `${member.firstName} ${member.lastName}` : (member.name || 'Unknown');
  const role = member.role === 'lead' ? 'Lead' : 'Member';
  const initial = (member.firstName || member.name || 'U').charAt(0);
  return (
    <div className="flex items-center justify-between rounded border bg-gray-50 px-2 py-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-400 text-white text-sm flex items-center justify-center">
          {initial}
        </div>
        <div className="text-sm text-gray-800">{name}</div>
        {member.role && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${member.role === 'lead' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {role}
          </span>
        )}
      </div>
      <button onClick={onView} className="text-xs px-2 py-1 border rounded hover:bg-gray-100">View Profile</button>
    </div>
  );
}
