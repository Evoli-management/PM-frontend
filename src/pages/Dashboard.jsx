import React from "react";
import Sidebar from "../components/shared/Sidebar";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={{ name: "Hussein" }} />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Dashboard</h1>
        <p className="text-gray-700">Welcome to your dashboard! Here you can manage your goals, calendar, teams, and more.</p>
      </main>
    </div>
  );
}
