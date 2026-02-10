import React, { useState } from 'react';
import { FaCheck, FaBan } from 'react-icons/fa';
import taskDelegationService from '../../services/taskDelegationService';

export default function PendingDelegationsSection({
  pendingTasks = [],
  onTaskAccept,
  onTaskReject,
  getDelegatorName,
  currentUserId
}) {
  const [respondingTaskId, setRespondingTaskId] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingTask, setAcceptingTask] = useState(null);
  const [keyAreas, setKeyAreas] = useState([]);
  const [selectedKeyArea, setSelectedKeyArea] = useState('');

  const loadKeyAreas = async () => {
    try {
      const { get } = await import('../../services/keyAreaService');
      const areas = await get();
      setKeyAreas(areas || []);
    } catch (error) {
      console.error('Failed to load key areas:', error);
    }
  };

  const handleAcceptClick = async (task) => {
    setAcceptingTask(task);
    setSelectedKeyArea('');
    await loadKeyAreas();
    setShowAcceptModal(true);
  };

  const confirmAccept = async () => {
    if (!selectedKeyArea || !acceptingTask) return;
    
    setRespondingTaskId(acceptingTask.id);
    try {
      await taskDelegationService.acceptDelegation(acceptingTask.id, {
        keyAreaId: selectedKeyArea,
      });
      onTaskAccept?.(acceptingTask.id);
      setShowAcceptModal(false);
      setAcceptingTask(null);
      setSelectedKeyArea('');
    } catch (error) {
      console.error('Failed to accept delegation:', error);
    } finally {
      setRespondingTaskId(null);
    }
  };

  const handleRejectClick = async (task) => {
    setRespondingTaskId(task.id);
    try {
      await taskDelegationService.rejectDelegation(task.id);
      onTaskReject?.(task.id);
    } catch (error) {
      console.error('Failed to reject delegation:', error);
    } finally {
      setRespondingTaskId(null);
    }
  };

  if (!pendingTasks || pendingTasks.length === 0) {
    return null;
  }

  return (
    <>
      {/* Pending Delegations Section */}
      <div className="mb-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            Pending Delegations ({pendingTasks.length})
          </h3>

          {/* Table for pending delegations */}
          <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-yellow-100 border-b border-yellow-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Title</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Deadline</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Received From</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-200 hover:bg-yellow-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {getDelegatorName(task)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleAcceptClick(task)}
                          disabled={respondingTaskId === task.id}
                          className="p-2 text-green-600 hover:bg-green-100 rounded transition disabled:opacity-50"
                          title="Accept this delegation"
                        >
                          <FaCheck size={16} />
                        </button>
                        <button
                          onClick={() => handleRejectClick(task)}
                          disabled={respondingTaskId === task.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition disabled:opacity-50"
                          title="Reject this delegation"
                        >
                          <FaBan size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Accept Delegation Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Accept Delegation</h2>
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setAcceptingTask(null);
                  setSelectedKeyArea('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {acceptingTask && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-1">Task:</p>
                  <p className="font-medium text-blue-900">{acceptingTask.title}</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Key Area <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Choose which Key Area to add this task to
                </p>
                <select
                  value={selectedKeyArea}
                  onChange={(e) => setSelectedKeyArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a Key Area --</option>
                  {keyAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAcceptModal(false);
                  setAcceptingTask(null);
                  setSelectedKeyArea('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmAccept}
                disabled={!selectedKeyArea || respondingTaskId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {respondingTaskId ? 'Accepting...' : 'Accept Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
