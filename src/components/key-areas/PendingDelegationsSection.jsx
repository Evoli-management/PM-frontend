import React, { useState } from 'react';
import { FaCheck, FaBan, FaSquare, FaListUl } from 'react-icons/fa';
import taskDelegationService from '../../services/taskDelegationService';
import activityDelegationService from '../../services/activityDelegationService';

export default function PendingDelegationsSection({
  pendingTasks = [],
  onTaskAccept,
  onTaskReject,
  getDelegatorName,
  currentUserId
}) {
  const [respondingItemId, setRespondingItemId] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingItem, setAcceptingItem] = useState(null);
  const [keyAreas, setKeyAreas] = useState([]);
  const [selectedKeyArea, setSelectedKeyArea] = useState('');
  const [keyAreaError, setKeyAreaError] = useState('');
  const [acceptMode, setAcceptMode] = useState('create-new');
  const [selectedTaskForActivity, setSelectedTaskForActivity] = useState('');
  const [availableTasks, setAvailableTasks] = useState([]);
  const [taskError, setTaskError] = useState('');

  const loadKeyAreas = async () => {
    try {
      const { get } = await import('../../services/keyAreaService');
      const areas = await get();
      setKeyAreas(areas || []);
    } catch (error) {
      console.error('Failed to load key areas:', error);
    }
  };

  const loadTasksForKeyArea = async (keyAreaId) => {
    try {
      if (!keyAreaId) {
        setAvailableTasks([]);
        return;
      }
      // Fetch tasks for the selected key area
      const { get } = await import('../../services/taskService');
      const tasks = await get({ keyAreaId });
      setAvailableTasks(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setAvailableTasks([]);
    }
  };

  const handleAcceptClick = async (item) => {
    setAcceptingItem(item);
    setSelectedKeyArea('');
    setSelectedTaskForActivity('');
    setKeyAreaError('');
    setTaskError('');
    setAcceptMode('create-new');
    await loadKeyAreas();
    setShowAcceptModal(true);
  };

  const confirmAccept = async () => {
    // Clear previous errors
    setKeyAreaError('');
    setTaskError('');
    
    // Validate key area
    if (!selectedKeyArea) {
      setKeyAreaError('Key area selection is required');
      return;
    }

    // Validate task selector for activity add-to-task mode
    if (acceptingItem?.type === 'activity' && acceptMode === 'add-to-task' && !selectedTaskForActivity) {
      setTaskError('Please select a task to add this activity to');
      return;
    }

    setRespondingItemId(acceptingItem.id);
    try {
      const payload = { keyAreaId: selectedKeyArea };
      
      if (acceptingItem.type === 'task') {
        // Accept task delegation
        await taskDelegationService.acceptDelegation(acceptingItem.id, payload);
        onTaskAccept?.(acceptingItem.id);
      } else {
        // Accept activity delegation
        if (acceptMode === 'add-to-task' && selectedTaskForActivity) {
          payload.taskId = selectedTaskForActivity;
        }
        await activityDelegationService.acceptDelegation(acceptingItem.id, payload);
        onTaskAccept?.(acceptingItem.id);
      }
      
      closeModal();
    } catch (error) {
      console.error('Failed to accept delegation:', error);
      setKeyAreaError(error?.response?.data?.message || 'Failed to accept. Please try again.');
    } finally {
      setRespondingItemId(null);
    }
  };

  const closeModal = () => {
    setShowAcceptModal(false);
    setAcceptingItem(null);
    setSelectedKeyArea('');
    setSelectedTaskForActivity('');
    setAvailableTasks([]);
    setKeyAreaError('');
    setTaskError('');
    setAcceptMode('create-new');
  };

  const handleRejectClick = async (item) => {
    const message = `Are you sure you want to reject this ${item.type} delegation?`;
    
    if (!window.confirm(message)) {
      return;
    }

    setRespondingItemId(item.id);
    try {
      if (item.type === 'task') {
        await taskDelegationService.rejectDelegation(item.id);
      } else {
        await activityDelegationService.rejectDelegation(item.id);
      }
      onTaskReject?.(item.id);
    } catch (error) {
      console.error('Failed to reject delegation:', error);
      alert('Failed to reject. Please try again.');
    } finally {
      setRespondingItemId(null);
    }
  };

  if (!pendingTasks || pendingTasks.length === 0) {
    return (
      <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-800 font-medium">
          ✓ No pending delegations
        </p>
        <p className="text-green-700 text-sm">
          You're all caught up! All delegations have been accepted or rejected.
        </p>
      </div>
    );
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
                  <th className="px-2 py-2 text-center w-8 font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Title</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Deadline</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Received From</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTasks.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="border-b border-gray-200 hover:bg-yellow-50">
                    <td className="px-2 py-3 text-center">
                      {item.type === 'task' ? (
                        <FaSquare title="Task" className="text-blue-600 mx-auto" />
                      ) : (
                        <FaListUl title="Activity" className="text-purple-600 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.dueDate || item.deadline ? new Date(item.dueDate || item.deadline).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {getDelegatorName(item)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleAcceptClick(item)}
                          disabled={respondingItemId === item.id}
                          className="p-2 text-green-600 hover:bg-green-100 rounded transition disabled:opacity-50"
                          title="Accept this delegation"
                        >
                          <FaCheck size={16} />
                        </button>
                        <button
                          onClick={() => handleRejectClick(item)}
                          disabled={respondingItemId === item.id}
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
              <h2 className="text-lg font-semibold text-gray-900">
                Accept {acceptingItem?.type === 'task' ? 'Task' : 'Activity'} Delegation
              </h2>
              <button
                onClick={() => closeModal()}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {/* Item Info */}
              {acceptingItem && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-gray-600 mb-1">
                    {acceptingItem.type === 'task' ? 'Task' : 'Activity'}:
                  </p>
                  <p className="font-medium text-blue-900">{acceptingItem.title}</p>
                  {acceptingItem.delegatedByUser && (
                    <p className="text-xs text-gray-600 mt-2">
                      From: <strong>{acceptingItem.delegatedByUser.name}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Error Messages */}
              {keyAreaError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  ⚠️ {keyAreaError}
                </div>
              )}

              {/* Key Area (Required for all) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Key Area <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Choose which Key Area to add this {acceptingItem?.type === 'task' ? 'task' : 'activity'} to
                </p>
                <select
                  value={selectedKeyArea}
                  onChange={(e) => {
                    setSelectedKeyArea(e.target.value);
                    setKeyAreaError('');
                    // Load tasks for the selected key area if it's an activity
                    if (acceptingItem?.type === 'activity') {
                      loadTasksForKeyArea(e.target.value);
                    }
                  }}
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

              {/* Task Selector (Only for Activities) */}
              {acceptingItem?.type === 'activity' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you like to proceed?
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="accept-mode"
                        value="create-new"
                        checked={acceptMode === 'create-new'}
                        onChange={(e) => {
                          setAcceptMode(e.target.value);
                          setSelectedTaskForActivity('');
                          setTaskError('');
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Create as new standalone activity
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="accept-mode"
                        value="add-to-task"
                        checked={acceptMode === 'add-to-task'}
                        onChange={(e) => setAcceptMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Add to existing task in key area
                      </span>
                    </label>
                  </div>

                  {/* Task Selector (shown only in add-to-task mode) */}
                  {acceptMode === 'add-to-task' && (
                    <div className="mt-3">
                      <select
                        value={selectedTaskForActivity}
                        onChange={(e) => {
                          setSelectedTaskForActivity(e.target.value);
                          setTaskError('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select a Task --</option>
                        {availableTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                      {taskError && (
                        <p className="text-red-500 text-xs mt-1">{taskError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => closeModal()}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmAccept}
                disabled={!selectedKeyArea || respondingItemId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {respondingItemId ? `Accepting ${acceptingItem?.type}...` : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
