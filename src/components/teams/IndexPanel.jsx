import React from 'react';

export function IndexPanel({ title, metrics, highlightedMetric }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-800">{title}</h3>
            
            <div className="space-y-2">
                {metrics.length === 0 ? (
                    <div className="text-xs text-gray-500">No data yet.</div>
                ) : metrics.map((metric, index) => {
                    const isHighlighted = highlightedMetric === metric.key;
                    const percentage = metric.value || 0;
                    
                    return (
                        <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className={`text-xs ${isHighlighted ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>
                                    {metric.label}
                                </span>
                                <span className={`text-xs font-medium ${isHighlighted ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {percentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${
                                        isHighlighted ? 'bg-blue-600' : 'bg-blue-400'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
