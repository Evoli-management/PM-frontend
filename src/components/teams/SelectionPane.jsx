import React from 'react';

export function SelectionPane({ title, items, selectedItems, onSelect, canSelect }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-800">{title}</h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {items.length === 0 ? (
                    <p className="text-xs text-gray-500">No items to display</p>
                ) : (
                    items.map((item) => {
                        const isSelected = selectedItems.includes(item.id);
                        return (
                            <div
                                key={item.id}
                                onClick={() => canSelect && onSelect(item.id)}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                    isSelected
                                        ? 'bg-blue-100 border border-blue-300'
                                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                                } ${!canSelect ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full ${
                                            item.type === 'team' ? 'bg-purple-500' : 'bg-gray-600'
                                        }`}
                                    ></div>
                                    <span className="text-sm text-gray-900">{item.name}</span>
                                </div>
                                {item.score !== undefined && (
                                    <span className="text-xs text-gray-600">
                                        Score: {item.score.toFixed(1)}
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
