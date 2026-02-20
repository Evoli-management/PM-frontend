import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaTrash, FaPlus, FaSpinner, FaTimes } from 'react-icons/fa';
import remindersService from '../../services/remindersService';
import { useFormattedDate } from '../../hooks/useFormattedDate';
import ReminderModal from './ReminderModal';

export default function RemindersListModal({ isOpen, onClose, inline = false }) {
  const { formatDate, formatTime } = useFormattedDate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // showModal/selectedReminder removed — create/edit will open in a global inline modal
  const [showModal, setShowModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const containerRef = useRef(null);

  // Load reminders
  useEffect(() => {
    if (isOpen) {
      loadReminders();
    }
  }, [isOpen]);

  // Refresh reminders when a reminder is created/updated elsewhere
  useEffect(() => {
    const onSaved = (e) => {
      try {
        loadReminders();
      } catch (err) {}
    };
    window.addEventListener('reminder-saved', onSaved);
    return () => window.removeEventListener('reminder-saved', onSaved);
  }, []);

  // When rendering inline (e.g. from navbar) allow closing via Escape key.
  // Outside clicks are handled by the transparent overlay element rendered behind the panel.
  useEffect(() => {
    if (!inline || !isOpen) return;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose && onClose();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inline, isOpen, onClose]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await remindersService.list();
      setReminders(data || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    // Close this panel first, then open the global inline create form.
    // Dispatching after a micro-task tick prevents visual overlap/flicker.
    try { onClose && onClose(); } catch (e) {}
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('open-reminder-inline', { detail: { reminder: null } }));
      } catch (err) {}
    }, 0);
  };

  const handleEdit = (reminder) => {
    // Close this panel first, then open the global inline edit form.
    try { onClose && onClose(); } catch (e) {}
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('open-reminder-inline', { detail: { reminder } }));
      } catch (err) {}
    }, 0);
  };

  const handleModalSave = async (saved) => {
    await loadReminders();
  };

  const handleDelete = async (reminderId) => {
    try {
      setDeleting(true);
      await remindersService.delete(reminderId);
      setDeleteConfirm(null);
      await loadReminders();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete reminder');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecurrenceLabel = (pattern) => {
    const patterns = remindersService.getRecurrencePatterns();
    return patterns.find(p => p.value === pattern)?.label || pattern;
  };

  if (!isOpen) return null;

  // Render inline dropdown (no page-covering backdrop) when requested
  if (inline) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-[150] flex items-center justify-center">
  {/* Use same overlay as main page modals: semi-transparent black */}
  <div className="absolute inset-0 bg-black/40" onClick={onClose} />

  <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-[min(1100px,90%)] overflow-visible flex flex-col z-10">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Reminders</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <FaTimes size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <FaSpinner className="animate-spin text-blue-600 text-3xl" />
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">No reminders yet</p>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create your first reminder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map(reminder => (
                  <div key={reminder.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{reminder.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(reminder.status)}`}>
                            {reminder.status}
                          </span>
                          {reminder.recurrencePattern !== 'none' && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {getRecurrenceLabel(reminder.recurrencePattern)}
                            </span>
                          )}
                        </div>

                        {reminder.description && (
                          <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                        )}

                        <div className="text-sm text-gray-500 space-y-1">
                          <p>
                            <strong>When:</strong> {formatDate(new Date(reminder.reminderDateTime))} at {formatTime(
                              typeof reminder.reminderDateTime === 'string' && reminder.reminderDateTime.includes('T')
                                ? reminder.reminderDateTime.split('T')[1]?.slice(0,5)
                                : (typeof reminder.reminderDateTime === 'string' ? reminder.reminderDateTime.slice(11,16) : '')
                            )}
                          </p>
                          {reminder.recurrencePattern !== 'none' && (
                            <p>
                              <strong>Repeat:</strong> {getRecurrenceLabel(reminder.recurrencePattern)}
                              {reminder.recurrenceEndDate && ` until ${formatDate(new Date(reminder.recurrenceEndDate))}`}
                            </p>
                          )}
                          <div className="flex gap-3">
                            {reminder.notifyViaPush && <span className="bg-white px-2 py-1 rounded text-xs border border-gray-200">🔔 Push</span>}
                            {reminder.notifyViaEmail && <span className="bg-white px-2 py-1 rounded text-xs border border-gray-200">✉️ Email</span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(reminder)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit reminder"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(reminder.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete reminder"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirm === reminder.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
                        <span className="text-sm text-gray-600">Delete this reminder?</span>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          disabled={deleting}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <button
              onClick={handleCreate}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
            >
              <FaPlus /> New Reminder
            </button>
          </div>
        </div>

        {/* Create/Edit Modal is now opened globally (see Navbar listener) */}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop - semi-transparent overlay that shows the page behind */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Modal */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
  <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-visible flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Reminders</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <FaTimes size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <FaSpinner className="animate-spin text-blue-600 text-3xl" />
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">No reminders yet</p>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create your first reminder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map(reminder => (
                  <div key={reminder.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{reminder.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(reminder.status)}`}>
                            {reminder.status}
                          </span>
                          {reminder.recurrencePattern !== 'none' && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {getRecurrenceLabel(reminder.recurrencePattern)}
                            </span>
                          )}
                        </div>

                        {reminder.description && (
                          <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                        )}

                        <div className="text-sm text-gray-500 space-y-1">
                          <p>
                            <strong>When:</strong> {formatDate(new Date(reminder.reminderDateTime))} at {formatTime(new Date(reminder.reminderDateTime))}
                          </p>
                          {reminder.recurrencePattern !== 'none' && (
                            <p>
                              <strong>Repeat:</strong> {getRecurrenceLabel(reminder.recurrencePattern)}
                              {reminder.recurrenceEndDate && ` until ${formatDate(new Date(reminder.recurrenceEndDate))}`}
                            </p>
                          )}
                          <div className="flex gap-3">
                            {reminder.notifyViaPush && <span className="bg-white px-2 py-1 rounded text-xs border border-gray-200">🔔 Push</span>}
                            {reminder.notifyViaEmail && <span className="bg-white px-2 py-1 rounded text-xs border border-gray-200">✉️ Email</span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(reminder)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit reminder"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(reminder.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete reminder"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirm === reminder.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
                        <span className="text-sm text-gray-600">Delete this reminder?</span>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          disabled={deleting}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <button
              onClick={handleCreate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <FaPlus /> New Reminder
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <ReminderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleModalSave}
        reminder={selectedReminder}
        inline={inline}
      />
    </>
  );
}
