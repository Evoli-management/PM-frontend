import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/shared/Sidebar';
import { FaBars } from 'react-icons/fa';
import { getCurrentEnpsScore, getEnpsTrend } from '../../services/enpsService';
import apiClient from '../../services/apiClient';

export default function EnpsDashboard() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [trend, setTrend] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cur = await getCurrentEnpsScore();
        const tr = await getEnpsTrend(12);
        const tb = await apiClient.get('/enps/team-breakdown');
        setCurrent(cur);
        setTrend(tr.trend || []);
        setTeams(tb.data.teams || []);
      } catch (e) {
        console.error('Failed to load ENPS dashboard', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ScoreBadge = ({ score }) => (
    <span className={`px-3 py-1 rounded-full text-sm ${
      score >= 50 ? 'bg-green-100 text-green-700' : score >= 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
    }`}>{score}</span>
  );

  return (
    <div className="flex min-h-screen bg-[#EDEDED] text-[CanvasText]">
      <Sidebar 
        user={{ name: 'Hussein' }} 
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-4 sm:p-6">
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <FaBars className="h-5 w-5 text-gray-600" />
        </button>
        <div className="mb-4">
          <a href="#/dashboard" className="text-sm text-blue-600">← Back to Dashboard</a>
        </div>
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">eNPS Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Organization eNPS overview, trend, and team breakdown.</p>

        {loading ? (
          <div className="mt-6 p-6 bg-white rounded-2xl shadow">Loading…</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="bg-white border rounded-2xl p-6 shadow col-span-1">
              <h2 className="font-semibold mb-3">Current eNPS</h2>
              {current && (
                <div>
                  <div className="text-4xl font-bold mb-2"><ScoreBadge score={current.score} /></div>
                  <div className="text-sm text-gray-500">Promoters: {current.promoters}% • Passives: {current.passives}% • Detractors: {current.detractors}%</div>
                  <div className="text-sm text-gray-500 mt-1">Responses: {current.totalResponses} • Period: {current.period}</div>
                </div>
              )}
            </section>

            <section className="bg-white border rounded-2xl p-6 shadow col-span-2">
              <h2 className="font-semibold mb-3">Trend (12 periods)</h2>
              <div className="flex items-end gap-2 h-40">
                {trend.map((p, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div
                      className="w-6 bg-blue-400"
                      style={{ height: `${Math.max(4, (p.score + 100) / 2)}px` }}
                      title={`${p.period}: ${p.score}`}
                    />
                    <div className="text-[10px] text-gray-500 mt-1">{p.period}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border rounded-2xl p-6 shadow col-span-3">
              <h2 className="font-semibold mb-3">Team Breakdown (current period)</h2>
              {teams.length === 0 ? (
                <div className="text-gray-500">No teams or no responses yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map(t => (
                    <div key={t.teamId} className="border rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{t.teamName}</div>
                        <ScoreBadge score={t.score} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Responses: {t.totalResponses}</div>
                      <div className="mt-2 text-xs text-gray-600">Promoters {t.promoters}% • Passives {t.passives}% • Detractors {t.detractors}%</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
