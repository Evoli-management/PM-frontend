import React, { useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";
import EnpsWidget from "../components/shared/EnpsWidget";

const summary = [
  { label: "Projects", value: null, color: "green", icon: "📁", action: "Add Project", tooltip: "Create a new project" },
  { label: "Tasks", value: null, color: "blue", icon: "✅", action: "Assign Task", tooltip: "Assign a new task" },
  { label: "Team", value: null, color: "purple", icon: "👥", action: "Invite Member", tooltip: "Invite a new team member" },
];

const recentActivity = null;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [showEnpsWidget, setShowEnpsWidget] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle anonymous eNPS submission
  const handleEnpsSubmission = (anonymousData) => {
    console.log('Anonymous eNPS submission received:', {
      score: anonymousData.score,
      feedback: anonymousData.feedback ? '[FEEDBACK PROVIDED]' : '[NO FEEDBACK]',
      timestamp: anonymousData.timestamp,
      // Note: No user identification stored
    });
    
    // In a real app, this would be sent to a backend that ensures anonymity
    // The backend should NOT store any user identification with eNPS responses
    
    // Hide widget after submission
    setTimeout(() => {
      setShowEnpsWidget(false);
    }, 3000);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={{ name: "Hussein" }} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-700">Dashboard</h1>
          <p className="text-gray-600 text-sm">Welcome to Practical Manager. Here’s your workspace overview.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {loading
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mb-2" />
                  <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                  <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
                  <div className="h-8 w-full bg-gray-200 rounded" />
                </div>
              ))
            : summary.map(card => (
                <div key={card.label} className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center hover:shadow-xl transition group`}>
                  <span className="text-4xl mb-2" aria-label={card.label}>{card.icon}</span>
                  <h2 className="text-base font-bold text-gray-700 mb-1">{card.label}</h2>
                  <span className={`text-3xl font-bold mb-2`} style={{ color: card.color === "green" ? "#059669" : card.color === "blue" ? "#2563eb" : "#7c3aed" }}>
                    {card.value === null ? <span className="text-gray-400 text-base">No data yet</span> : card.value}
                  </span>
                  <button
                    className={`rounded-lg px-4 py-2 font-semibold transition w-full focus:outline-none focus:ring-2 focus:ring-${card.color}-400 bg-${card.color}-600 text-white hover:bg-${card.color}-700`}
                    aria-label={card.action}
                    title={card.tooltip}
                  >
                    {card.action}
                  </button>
                </div>
              ))}
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-700 mb-4">Recent Activity</h2>
          {loading ? (
            <ul>
              {Array(3).fill(0).map((_, i) => (
                <li key={i} className="flex items-center justify-between py-2 border-b last:border-b-0 animate-pulse">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-12 bg-gray-200 rounded" />
                </li>
              ))}
            </ul>
          ) : recentActivity === null ? (
            <div className="text-gray-400 text-base py-4 text-center">No activity data yet</div>
          ) : (
            <ul>
              {recentActivity.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <span className="font-semibold text-gray-700">{item.desc}</span>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* eNPS Widget - Privacy-focused Employee Net Promoter Score */}
        {showEnpsWidget && (
          <div className="mb-8">
            <EnpsWidget 
              onSubmitScore={handleEnpsSubmission}
              showResults={false}
              privacySettings={{
                allowAnonymousScoring: true,
                showIndividualScores: false,
                enableTeamReports: true,
                enableOrgReports: true
              }}
            />
          </div>
        )}
        
        <div className="text-center text-gray-400 text-xs">All data is for demo purposes only.</div>
      </main>
    </div>
  );
}
