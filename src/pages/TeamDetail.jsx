import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { FaBars, FaAward, FaUsers, FaChartLine, FaSmile } from "react-icons/fa";
import teamsService from "../services/teamsService";

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'members'

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [dashboardData, membersData] = await Promise.all([
          teamsService.getTeamDashboard(teamId),
          teamsService.getTeamMembers(teamId)
        ]);
        setDashboard(dashboardData || null);
        setMembers(membersData || []);
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
                  {/* Header */}
                  <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {dashboard?.name?.charAt(0)}
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold text-gray-900">{dashboard?.name}</h1>
                        <p className="text-xs text-gray-600">
                          {dashboard?.memberCount || 0} {dashboard?.memberCount === 1 ? 'member' : 'members'}
                          {dashboard?.leadName && <span className="ml-2">• Led by {dashboard.leadName}</span>}
                        </p>
                      </div>
                    </div>
                  </header>

                  {/* Tabs */}
                  <div className="flex gap-4 border-b border-gray-200">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'dashboard'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setActiveTab('members')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'members'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Members
                    </button>
                  </div>

                  {/* Dashboard Tab */}
                  {activeTab === 'dashboard' && dashboard && (
                    <div className="space-y-6">
                      {/* Description */}
                      {dashboard.description && (
                        <section>
                          <h2 className="mb-2 text-[15px] font-semibold text-gray-800">Description</h2>
                          <p className="text-sm text-gray-700">{dashboard.description}</p>
                        </section>
                      )}

                      {/* Quick Stats */}
                      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                          icon={<FaAward className="text-blue-500" />}
                          label="Total Strokes"
                          value={dashboard.recognitions.total}
                          subtitle="Last 30 days"
                        />
                        <StatCard
                          icon={<FaUsers className="text-green-500" />}
                          label="Participation"
                          value={`${dashboard.recognitions.participation.participationRate}%`}
                          subtitle={`${dashboard.recognitions.participation.participatedMembers}/${dashboard.recognitions.participation.totalMembers} members`}
                        />
                        <StatCard
                          icon={<FaSmile className="text-yellow-500" />}
                          label="Team eNPS"
                          value={dashboard.enps.avgScore !== null ? dashboard.enps.avgScore.toFixed(1) : 'N/A'}
                          subtitle={`${dashboard.enps.responseCount} responses`}
                        />
                        <StatCard
                          icon={<FaChartLine className="text-purple-500" />}
                          label="Active Members"
                          value={dashboard.memberCount}
                          subtitle={dashboard.leadName ? `Led by ${dashboard.leadName}` : 'No lead assigned'}
                        />
                      </section>

                      {/* Recognition Breakdown */}
                      <section>
                        <h2 className="mb-3 text-[15px] font-semibold text-gray-800">Recognition Breakdown</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <RecognitionTypeCard
                            type="Employeeship"
                            count={dashboard.recognitions.byType.employeeship}
                            total={dashboard.recognitions.total}
                            color="bg-blue-500"
                          />
                          <RecognitionTypeCard
                            type="Performance"
                            count={dashboard.recognitions.byType.performance}
                            total={dashboard.recognitions.total}
                            color="bg-green-500"
                          />
                          <RecognitionTypeCard
                            type="Achievement"
                            count={dashboard.recognitions.byType.achievement}
                            total={dashboard.recognitions.total}
                            color="bg-yellow-500"
                          />
                        </div>
                      </section>

                      {/* Recognition Trend */}
                      {dashboard.recognitions.trend.length > 0 && (
                        <section>
                          <h2 className="mb-3 text-[15px] font-semibold text-gray-800">Recognition Trend</h2>
                          <div className="space-y-2">
                            {dashboard.recognitions.trend.map((item, index) => (
                              <TrendBar key={index} week={item.week} count={item.count} />
                            ))}
                          </div>
                        </section>
                      )}

                      {/* eNPS Details */}
                      {dashboard.enps.responseCount > 0 && (
                        <section>
                          <h2 className="mb-3 text-[15px] font-semibold text-gray-800">Team eNPS Details</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <EnpsCard label="Promoters" count={dashboard.enps.promoters} color="bg-green-100 text-green-800" />
                            <EnpsCard label="Passives" count={dashboard.enps.passives} color="bg-yellow-100 text-yellow-800" />
                            <EnpsCard label="Detractors" count={dashboard.enps.detractors} color="bg-red-100 text-red-800" />
                          </div>
                        </section>
                      )}
                    </div>
                  )}

                  {/* Members Tab */}
                  {activeTab === 'members' && (
                    <section>
                      <h2 className="mb-3 text-[15px] font-semibold text-gray-800">Team Members</h2>
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
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="text-2xl mt-1">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function RecognitionTypeCard({ type, count, total, color }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{type}</span>
        <span className={`${color} text-white text-xs px-2 py-1 rounded`}>{count}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
    </div>
  );
}

function TrendBar({ week, count }) {
  const date = new Date(week);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const maxCount = 20; // Scale bar relative to 20 strokes
  const width = Math.min((count / maxCount) * 100, 100);
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-20">{formatted}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
        <div 
          className="bg-blue-500 h-6 rounded-full transition-all flex items-center justify-end pr-2"
          style={{ width: `${width}%` }}
        >
          {width > 15 && <span className="text-xs text-white font-medium">{count}</span>}
        </div>
        {width <= 15 && count > 0 && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-700 font-medium">{count}</span>
        )}
      </div>
    </div>
  );
}

function EnpsCard({ label, count, color }) {
  return (
    <div className={`${color} rounded-lg p-4 border`}>
      <p className="text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold">{count}</p>
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
