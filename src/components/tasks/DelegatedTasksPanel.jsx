import { useState, useEffect } from 'react';
import { FaUserCheck, FaTimes, FaHistory } from 'react-icons/fa';
import taskDelegationService from '../../services/taskDelegationService';
import { useToast } from '../shared/ToastProvider.jsx';

export default function DelegatedTasksPanel({ onTaskClick }) {
    const [delegatedTasks, setDelegatedTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);

    const { addToast } = useToast ? useToast() : { addToast: () => {} };

    useEffect(() => {
        loadDelegatedTasks();
    }, []);

    const loadDelegatedTasks = async () => {
        setLoading(true);
        try {
            const data = await taskDelegationService.getDelegatedToMe();
            setDelegatedTasks(data || []);
        } catch (error) {
            console.error('Failed to load delegated tasks:', error);
            addToast({
                title: 'Failed to load delegated tasks',
                variant: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async (taskId) => {
        try {
            const data = await taskDelegationService.getDelegationHistory(taskId);
            setHistory(data || []);
            setShowHistory(true);
        } catch (error) {
            console.error('Failed to load delegation history:', error);
            addToast({
                title: 'Failed to load delegation history',
                variant: 'error',
            });
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FaUserCheck className="text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Delegated to Me
                    </h2>
                </div>
                <div className="text-center text-gray-500 dark:text-gray-400">
                    Loading delegated tasks...
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FaUserCheck className="text-blue-600" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Delegated to Me
                            </h2>
                            {delegatedTasks.length > 0 && (
                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                    {delegatedTasks.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={loadDelegatedTasks}
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {delegatedTasks.length === 0 ? (
                        <div className="text-center py-8">
                            <FaUserCheck className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">
                                No tasks delegated to you
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {delegatedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 
                                             hover:border-blue-500 dark:hover:border-blue-500 transition-colors
                                             cursor-pointer"
                                    onClick={() => onTaskClick?.(task)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                                {task.title}
                                            </h3>
                                            {task.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                {task.delegatedByUser && (
                                                    <div className="flex items-center gap-1">
                                                        <span>Delegated by:</span>
                                                        <span className="font-medium">
                                                            {task.delegatedByUser.firstName} {task.delegatedByUser.lastName}
                                                        </span>
                                                    </div>
                                                )}
                                                {task.delegatedAt && (
                                                    <div>
                                                        {new Date(task.delegatedAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                                {task.status && (
                                                    <div>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                                            ${task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                            {task.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTask(task);
                                                loadHistory(task.id);
                                            }}
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                            title="View delegation history"
                                        >
                                            <FaHistory />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Delegation History Modal */}
            {showHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <FaHistory className="text-blue-600" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Delegation History
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowHistory(false);
                                    setSelectedTask(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {selectedTask && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
                                    <p className="font-medium text-blue-900 dark:text-blue-100">
                                        {selectedTask.title}
                                    </p>
                                </div>
                            )}

                            {history.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No delegation history found
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((item) => (
                                        <div
                                            key={item.id}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    <FaUserCheck className="text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {item.delegatedByUser?.firstName} {item.delegatedByUser?.lastName}
                                                        </span>
                                                        <span className="text-gray-500 dark:text-gray-400">→</span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {item.delegatedToUser?.firstName} {item.delegatedToUser?.lastName}
                                                        </span>
                                                    </div>
                                                    {item.notes && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(item.delegatedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
