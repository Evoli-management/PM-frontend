import React from "react";
import { Link } from "react-router-dom";

export default function KeyAreasWidget({ keyAreas = [], loading = false, error = null }) {
    // Calculate summary stats
    const totalKeyAreas = keyAreas.length;
    const totalTasks = keyAreas.reduce((sum, ka) => sum + (ka.taskCount || 0), 0);
    const nonIdeasAreas = keyAreas.filter(ka => 
        !ka.is_default && String(ka.title || "").trim().toLowerCase() !== "ideas"
    );
    
    // Get top 5 key areas by task count (excluding Ideas)
    const topKeyAreas = [...nonIdeasAreas]
        .sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0))
        .slice(0, 5);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-sm text-[CanvasText] opacity-70">Loading key areas...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border">
                Failed to load key areas: {error}
            </div>
        );
    }

    if (totalKeyAreas === 0) {
        return (
            <div className="text-[CanvasText] opacity-70">
                No key areas yet. <Link to="/key-areas" className="text-blue-600">Create your first key area</Link>!
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{totalKeyAreas}</div>
                    <div className="text-xs text-[CanvasText] opacity-70">Key Areas</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{totalTasks}</div>
                    <div className="text-xs text-[CanvasText] opacity-70">Total Tasks</div>
                </div>
            </div>

            {/* Top key areas list */}
            {topKeyAreas.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-[CanvasText] opacity-80 mb-2">
                        Top Key Areas
                    </div>
                    <ul className="space-y-2">
                        {topKeyAreas.map((ka) => (
                            <li key={ka.id} className="border rounded p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                                <Link 
                                    to={`/key-areas?ka=${ka.id}`}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: ka.color || '#3B82F6' }}
                                            title={ka.color || 'Default color'}
                                        />
                                        <span className="font-medium text-sm truncate">{ka.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded">
                                            {ka.taskCount || 0} {ka.taskCount === 1 ? 'task' : 'tasks'}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Quick action */}
            <div className="mt-4 pt-3 border-t">
                <Link 
                    to="/key-areas" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    View all Key Areas →
                </Link>
            </div>
        </div>
    );
}
