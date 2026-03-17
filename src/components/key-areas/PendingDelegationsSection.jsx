import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaBan, FaSquare, FaListUl, FaExclamation, FaArrowDown } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import taskDelegationService from '../../services/taskDelegationService';
import activityDelegationService from '../../services/activityDelegationService';
import { formatKeyAreaLabel } from '../../utils/keyAreaDisplay';

export default function PendingDelegationsSection({
  pendingTasks = [],
  pendingLoading = false,
  onTaskAccept,
  onTaskReject,
  getDelegatorName,
  currentUserId,
  keyAreas: keyAreasFromProps = []
}) {
  const { t } = useTranslation();
  const [respondingItemId, setRespondingItemId] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingItem, setAcceptingItem] = useState(null);
  const [keyAreas, setKeyAreas] = useState([]);
  const [selectedKeyArea, setSelectedKeyArea] = useState('');
  const [keyAreaError, setKeyAreaError] = useState('');
  // Accept mode: 'create-new' (default, add as new task), 'add-to-task' (attach as activity)
  const [acceptMode, setAcceptMode] = useState('create-new');
  const [selectedTaskForActivity, setSelectedTaskForActivity] = useState('');
  const [availableTasks, setAvailableTasks] = useState([]);
  const [taskError, setTaskError] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  // State for Task List selection
  const [selectedListIndex, setSelectedListIndex] = useState('');
  const [availableLists, setAvailableLists] = useState([]);
  const [listNames, setListNames] = useState({});
  const [listError, setListError] = useState('');

  const normalizeKeyAreaTitle = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const getRawKeyAreaLabel = (area) => area?.name || area?.title || 'Untitled';
  const getKeyAreaLabel = (area, index = null) => formatKeyAreaLabel(area, index);

  // Format date as dd.mm.yyyy
  const formatDate = (date) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '-';
    }
  };

  const loadKeyAreas = async () => {
    try {
      const mod = await import('../../services/keyAreaService');
      const svc = mod.default || mod;
      let areas = [];
      if (typeof svc.list === 'function') {
        areas = await svc.list({ includeTaskCount: false });
      } else if (typeof mod.get === 'function') {
        areas = await mod.get();
      }
      setKeyAreas(Array.isArray(areas) ? areas : []);
      setKeyAreaError(''); // Clear error on success
    } catch (error) {
      console.error('Failed to load key areas:', error);
      setKeyAreaError('Failed to load key areas. Please refresh the page.');
      setKeyAreas([]);
    }
  };

  const loadTasksForKeyArea = async (keyAreaId) => {
    try {
      if (!keyAreaId) {
        setAvailableTasks([]);
        return;
      }
      if (String(keyAreaId).startsWith('__missing_')) {
        setAvailableTasks([]);
        return;
      }
      // Fetch tasks for the selected key area
      const taskService = (await import('../../services/taskService')).default;
      const tasks = await taskService.list({ keyAreaId });
      setAvailableTasks(Array.isArray(tasks) ? tasks : []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setAvailableTasks([]);
    }
  };

  // Reload tasks when key area changes and we're in add-to-task mode
  React.useEffect(() => {
    if (acceptMode === 'add-to-task' && selectedKeyArea && !String(selectedKeyArea).startsWith('__missing_')) {
      loadTasksForKeyArea(selectedKeyArea);
    } else {
      setAvailableTasks([]);
    }
    // Always clear selected task when key area changes
    setSelectedTaskForActivity('');
  }, [selectedKeyArea, acceptMode]);

  const handleAcceptClick = async (item) => {
    setAcceptingItem(item);
    setSelectedKeyArea('');
    setSelectedListIndex('');
    setAvailableLists([]);
    setListNames({});
    setListError('');
    setSelectedTaskForActivity('');
    setKeyAreaError('');
    setTaskError('');
    setAcceptMode('create-new');
    if (Array.isArray(keyAreasFromProps) && keyAreasFromProps.length > 0) {
      setKeyAreas(keyAreasFromProps);
    } else {
      await loadKeyAreas();
    }
    setShowAcceptModal(true);
  };

  const confirmAccept = async () => {
    setKeyAreaError('');
    setTaskError('');
    setListError('');
    if (!selectedKeyArea) {
      setKeyAreaError('Key area selection is required');
      return;
    }
    if (String(selectedKeyArea).startsWith('__missing_')) {
      setKeyAreaError('This key area is not available for selection yet');
      return;
    }
    if (!selectedListIndex) {
      setListError('Task List selection is required');
      return;
    }
    if (acceptingItem?.type === 'activity' && acceptMode === 'add-to-task' && !selectedTaskForActivity) {
      setTaskError('Please select a task to add this activity to');
      return;
    }
    setRespondingItemId(acceptingItem.id);
    try {
      // Ensure listIndex is sent as integer, not string
      const payload = { keyAreaId: selectedKeyArea, listIndex: Number(selectedListIndex) };
      if (acceptingItem.type === 'task') {
        // Accept task delegation
        await taskDelegationService.acceptDelegation(acceptingItem.id, payload);
        onTaskAccept?.(acceptingItem.id);
      } else {
        // Accept activity delegation
        if (acceptMode === 'add-to-task' && selectedTaskForActivity) {
          payload.taskId = selectedTaskForActivity;
        }
        // If 'create-new', do not add taskId to payload (backend should create a new task)
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
    setSelectedListIndex('');
    setAvailableLists([]);
    setListNames({});
    setListError('');
    setSelectedTaskForActivity('');
    setAvailableTasks([]);
    setKeyAreaError('');
    setTaskError('');
    setAcceptMode('create-new');
  };

  const handleRejectClick = async (item) => {
    setRejectingItem(item);
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    if (!rejectingItem) return;

    setRespondingItemId(rejectingItem.id);
    try {
      if (rejectingItem.type === 'task') {
        await taskDelegationService.rejectDelegation(rejectingItem.id);
      } else {
        await activityDelegationService.rejectDelegation(rejectingItem.id);
      }
      onTaskReject?.(rejectingItem.id);
    } catch (error) {
      console.error('Failed to reject delegation:', error);
      alert('Failed to reject. Please try again.');
    } finally {
      setRespondingItemId(null);
      setShowRejectConfirm(false);
      setRejectingItem(null);
    }
  };

  if (pendingLoading) {
    // Load silently; avoid showing a blocking/loading box in the UI.
    return null;
  }
  if (!pendingTasks || pendingTasks.length === 0) {
    return null;
  }

  const normalizedTitles = new Set(
    keyAreas.map((area) => normalizeKeyAreaTitle(getRawKeyAreaLabel(area)))
  );
  const keyAreaOptions = keyAreas.map((ka, idx) => ({
    value: ka.id,
    label: getKeyAreaLabel(ka, idx),
  }));
  if (!normalizedTitles.has('ideas')) {
    keyAreaOptions.push({
      value: '__missing_ideas',
      label: '💡 Ideas (unavailable)',
      isDisabled: true,
    });
  }
  if (!normalizedTitles.has('dontforget')) {
    keyAreaOptions.push({
      value: '__missing_dont_forget',
      label: "Don't Forget (create key area first)",
      isDisabled: true,
    });
  }
  const selectedKeyAreaOption = keyAreaOptions.find(
    (option) => String(option.value) === String(selectedKeyArea)
  );

  return (
    <>
      {/* Pending Delegations Section */}
      <div className="mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {t("pendingDelegationsSection.title", { n: pendingTasks.length })}
          </h3>

          {/* Table for pending delegations */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="min-w-full text-sm whitespace-nowrap sm:whitespace-normal">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-center w-8 font-semibold">{t("pendingDelegationsSection.colType")}</th>
                  <th className="px-2 sm:px-3 py-2 text-center w-6 font-semibold">{t("pendingDelegationsSection.colPriority")}</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold">{t("pendingDelegationsSection.colTitle")}</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold">{t("pendingDelegationsSection.colDeadline")}</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-semibold">{t("pendingDelegationsSection.colFrom")}</th>
                  <th className="px-2 sm:px-3 py-2 text-center font-semibold">{t("pendingDelegationsSection.colActions")}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <AnimatePresence mode="popLayout">
                  {pendingTasks.map((item) => (
                    <motion.tr
                      key={`${item.type}-${item.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-2 sm:px-3 py-3 text-center">
                        {item.type === 'task' ? (
                          <FaSquare title="Task" className="text-blue-600 mx-auto" />
                        ) : (
                          <FaListUl title="Activity" className="text-purple-600 mx-auto" />
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-center">
                        {item.priority === 'high' && (
                          <FaExclamation 
                            title="High Priority" 
                            className="text-red-600 mx-auto inline-block" 
                          />
                        )}
                        {item.priority === 'low' && (
                          <FaArrowDown 
                            title="Low Priority" 
                            className="text-blue-600 mx-auto inline-block" 
                          />
                        )}
                        {(!item.priority || item.priority === 'normal') && (
                          <div className="text-gray-400 mx-auto text-xs">—</div>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-3 font-medium text-slate-900">{item.title}</td>
                      <td className="px-2 sm:px-3 py-3 text-slate-600">
                        {formatDate(item.dueDate || item.deadline)}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-slate-600">
                        {getDelegatorName(item)}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-center">
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
                    </motion.tr>
                  ))}
                </AnimatePresence>
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
                {t("pendingDelegationsSection.acceptModalTitle")}
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
                  {t("pendingDelegationsSection.keyAreaLabel")} <span className="text-red-500">*</span>
                </label>
                <Select
                  options={keyAreaOptions}
                  value={keyAreaOptions.find((opt) => String(opt.value) === String(selectedKeyArea)) || null}
                  onChange={(opt) => {
                    setSelectedKeyArea(opt?.value || '');
                    setKeyAreaError('');
                    setSelectedListIndex('');
                    setListError('');
                    // Find selected key area object
                    const kaObj = keyAreas.find((ka) => String(ka.id) === String(opt?.value));
                    // Sync listNames from selected key area (like CreateTaskModal)
                    const names = (kaObj && kaObj.listNames) ? kaObj.listNames : {};
                    setListNames(names);
                    // Build available list indices: 1..max(named keys), always at least [1]
                    const namedKeys = Object.keys(names).map(Number).filter((n) => n >= 1);
                    const maxIdx = namedKeys.length ? Math.max(...namedKeys) : 1;
                    const lists = Array.from({ length: maxIdx }, (_, i) => i + 1);
                    setAvailableLists(lists);
                    // Auto-select if only one list available
                    if (lists.length === 1) {
                      setSelectedListIndex(String(lists[0]));
                    }
                    if (acceptingItem?.type === 'activity' && acceptMode === 'add-to-task') {
                      loadTasksForKeyArea(opt?.value || '');
                    }
                  }}
                  placeholder="Search key areas..."
                  isClearable
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '2.5rem',
                      fontSize: '0.875rem',
                    }),
                  }}
                />
                {keyAreaError && (
                  <p className="text-red-500 text-xs mt-1">{keyAreaError}</p>
                )}
              </div>

              {/* Task List (Required for all) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("pendingDelegationsSection.listLabel")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedListIndex}
                  onChange={(e) => {
                    setSelectedListIndex(e.target.value);
                    setListError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedKeyArea || availableLists.length === 0}
                >
                  <option value="">{t("pendingDelegationsSection.selectKeyArea")}</option>
                  {availableLists.map((n) => (
                    <option key={n} value={n}>
                      {listNames[n] || `List ${n}`}
                    </option>
                  ))}
                </select>
                {listError && (
                  <p className="text-red-500 text-xs mt-1">{listError}</p>
                )}
              </div>

              {/* Accept Mode Selector (Only for Activities) */}
              {acceptingItem?.type === 'activity' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("pendingDelegationsSection.modeLabel")}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="accept-mode"
                        value="create-new"
                        checked={acceptMode === 'create-new'}
                        onChange={(e) => setAcceptMode(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        {t("pendingDelegationsSection.modeTask")}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="accept-mode"
                        value="add-to-task"
                        checked={acceptMode === 'add-to-task'}
                        onChange={(e) => {
                          setAcceptMode(e.target.value);
                          // Load tasks for the selected key area when switching to add-to-task mode
                          if (e.target.value === 'add-to-task' && selectedKeyArea) {
                            loadTasksForKeyArea(selectedKeyArea);
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        {t("pendingDelegationsSection.modeActivity")}
                      </span>
                    </label>
                  </div>
                  {/* Task Selector (only if add-to-task is chosen) */}
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
                {t("pendingDelegationsSection.cancel")}
              </button>
              <button
                onClick={confirmAccept}
                disabled={!selectedKeyArea || respondingItemId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {respondingItemId ? t("pendingDelegationsSection.confirm") : t("pendingDelegationsSection.accept")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reject Confirmation Modal */}
      {showRejectConfirm && rejectingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("pendingDelegationsSection.reject")}
              </h3>
              <p className="text-gray-600 mb-4">
                {t("pendingDelegationsSection.rejectConfirm")}
              </p>
              <p className="text-sm text-blue-600 mb-4">
                <strong>{rejectingItem.title}</strong>
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowRejectConfirm(false);
                  setRejectingItem(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t("pendingDelegationsSection.cancel")}
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {t("pendingDelegationsSection.reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
