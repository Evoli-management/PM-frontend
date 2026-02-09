import { useState, useEffect } from 'react';
import { FaUserPlus, FaTimes } from 'react-icons/fa';
import organizationService from '../../services/organizationService';
import taskDelegationService from '../../services/taskDelegationService';
import { useToast } from '../shared/ToastProvider.jsx';

export default function TaskDelegationModal({ isOpen, onClose, task, onDelegated }) {
    const { addToast } = useToast ? useToast() : { addToast: () => {} };
    const [members, setMembers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadMembers();
            setSelectedUserId('');
            setNotes('');
        }
    }, [isOpen]);

    const loadMembers = async () => {
        setLoadingMembers(true);
        try {
            const data = await organizationService.getOrganizationMembers();
            setMembers(data || []);
        } catch (error) {
            console.error('Failed to load members:', error);
            addToast({
                title: 'Failed to load team members',
                variant: 'error',
            });
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleDelegate = async () => {
        if (!selectedUserId) {
            addToast({
                title: 'Please select a team member',
                variant: 'warning',
            });
            return;
        }

        setLoading(true);
        try {
            const result = await taskDelegationService.delegateTask(task.id, {
                delegatedToUserId: selectedUserId,
                notes: notes.trim() || undefined,
            });

            addToast({
                title: 'Task delegated successfully',
                variant: 'success',
            });

            onDelegated?.(result);
            onClose();
        } catch (error) {
            console.error('Failed to delegate task:', error);
            addToast({
                title: error.response?.data?.message || 'Failed to delegate task',
                variant: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedMember = members.find((m) => (m.userId || m.id) === selectedUserId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <FaUserPlus className="text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Delegate Task
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {/* Task Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {task?.title || 'Task'}
                        </p>
                        {task?.description && (
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                {task.description}
                            </p>
                        )}
                    </div>

                    {/* Team Member Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Delegate to:
                        </label>
                        {loadingMembers ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Loading team members...
                            </div>
                        ) : (
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select team member...</option>
                                {members.map((member) => {
                                    const value = member.userId || member.id;
                                    return (
                                        <option key={value} value={value}>
                                            {member.firstName} {member.lastName} ({member.email})
                                            {member.role && ` - ${member.role}`}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notes (optional):
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any context or instructions..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                     resize-none"
                        />
                    </div>

                    {/* Selected Member Preview */}
                    {selectedMember && (
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Delegating to:
                            </p>
                            <div className="flex items-center gap-2">
                                {selectedMember.avatarUrl ? (
                                    <img
                                        src={selectedMember.avatarUrl}
                                        alt={selectedMember.firstName}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                        {selectedMember.firstName?.[0]}{selectedMember.lastName?.[0]}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {selectedMember.firstName} {selectedMember.lastName}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {selectedMember.email}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelegate}
                        disabled={loading || !selectedUserId}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600
                                 hover:bg-blue-700 rounded-lg
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Delegating...
                            </>
                        ) : (
                            <>
                                <FaUserPlus />
                                Delegate Task
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
