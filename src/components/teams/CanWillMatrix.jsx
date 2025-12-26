import React from 'react';

export function CanWillMatrix({ data, selectedItems, onItemClick }) {
    // CAN-WILL Matrix quadrants
    const quadrants = [
        { name: 'High CAN, Low WILL', position: 'top-left', color: 'bg-yellow-100' },
        { name: 'High CAN, High WILL', position: 'top-right', color: 'bg-green-100' },
        { name: 'Low CAN, Low WILL', position: 'bottom-left', color: 'bg-red-100' },
        { name: 'Low CAN, High WILL', position: 'bottom-right', color: 'bg-blue-100' },
    ];

    const getItemPosition = (item) => {
        const can = item.canScore || 0;
        const will = item.willScore || 0;
        
        // Convert 0-100 scores to percentage positions
        return {
            left: `${will}%`,
            bottom: `${can}%`,
        };
    };

    const getItemColor = (item) => {
        if (selectedItems.includes(item.id)) return 'bg-blue-600';
        if (item.type === 'team') return 'bg-purple-500';
        return 'bg-gray-600';
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-4 text-gray-800">CAN-WILL Matrix</h3>
            
            {/* Matrix Container */}
            <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                {/* Quadrant backgrounds */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-gray-300">
                    <div className="bg-yellow-50"></div>
                    <div className="bg-green-50"></div>
                    <div className="bg-red-50"></div>
                    <div className="bg-blue-50"></div>
                </div>

                {/* Axes */}
                <div className="absolute inset-0">
                    {/* Vertical axis (CAN) */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-400"></div>
                    <div className="absolute left-0 bottom-0 -ml-8 text-xs text-gray-600 transform -rotate-90 origin-bottom-left">
                        CAN
                    </div>
                    
                    {/* Horizontal axis (WILL) */}
                    <div className="absolute left-0 bottom-0 right-0 h-px bg-gray-400"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6 text-xs text-gray-600">
                        WILL
                    </div>

                    {/* Center lines */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300"></div>
                </div>

                {/* Data points */}
                <div className="absolute inset-0">
                    {data.map((item) => {
                        const position = getItemPosition(item);
                        return (
                            <button
                                key={item.id}
                                onClick={() => onItemClick?.(item)}
                                className={`absolute w-3 h-3 rounded-full ${getItemColor(item)} border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform cursor-pointer`}
                                style={position}
                                title={`${item.name}: CAN ${item.canScore}, WILL ${item.willScore}`}
                            >
                                <span className="sr-only">{item.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Scale markers */}
                <div className="absolute left-0 top-0 bottom-0 text-xs text-gray-500">
                    <span className="absolute -left-6 top-0">100</span>
                    <span className="absolute -left-6 top-1/2 transform -translate-y-1/2">50</span>
                    <span className="absolute -left-6 bottom-0">0</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 text-xs text-gray-500">
                    <span className="absolute left-0 -bottom-6">0</span>
                    <span className="absolute left-1/2 transform -translate-x-1/2 -bottom-6">50</span>
                    <span className="absolute right-0 -bottom-6">100</span>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-8 pt-4 border-t flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>Teams</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    <span>Users</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span>Selected</span>
                </div>
            </div>
        </div>
    );
}
