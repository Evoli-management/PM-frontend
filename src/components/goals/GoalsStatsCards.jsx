// src/components/goals/GoalsStatsCards.jsx
import React from "react";
import { FaBullseye, FaClock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const StatCard = ({ title, value, icon: Icon, bgColor, textColor }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-slate-600 text-sm font-medium">{title}</p>
                <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
            </div>
            <div className={`p-3 ${bgColor} rounded-xl`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    </div>
);

const GoalsStatsCards = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Total Goals"
                value={stats.total}
                icon={FaBullseye}
                bgColor="bg-blue-50"
                textColor="text-slate-900"
            />

            <StatCard
                title="Active Goals"
                value={stats.active}
                icon={FaClock}
                bgColor="bg-blue-50"
                textColor="text-blue-600"
            />

            <StatCard
                title="Completed"
                value={stats.completed}
                icon={FaCheckCircle}
                bgColor="bg-green-50"
                textColor="text-green-600"
            />

            <StatCard
                title="Overdue"
                value={stats.overdue}
                icon={FaExclamationTriangle}
                bgColor="bg-red-50"
                textColor="text-red-600"
            />
        </div>
    );
};

export default GoalsStatsCards;
