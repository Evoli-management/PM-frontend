import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheck, FaSpinner } from 'react-icons/fa';
import remindersService from '../../services/remindersService';
import { useFormattedDate } from '../../hooks/useFormattedDate';

export default function ReminderModal({ 
  isOpen, 
  onClose, 
  onSave, 
  reminder = null,
  defaultGoalId = null,
  defaultKeyAreaId = null 
}) {
  const { formatDate } = useFormattedDate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminderDateTime: '',
    recurrencePattern: 'none',
    recurrenceEndDate: '',
    notifyViaEmail: false,
    notifyViaPush: true,
    goalId: defaultGoalId || '',
    keyAreaId: defaultKeyAreaId || '',
  });

  // Initialize form with reminder data if editing
  useEffect(() => {
    if (reminder) {
      setFormData({
        title: reminder.title || '',
        description: reminder.description || '',
        reminderDateTime: reminder.reminderDateTime || '',
        recurrencePattern: reminder.recurrencePattern || 'none',
        recurrenceEndDate: reminder.recurrenceEndDate || '',
        notifyViaEmail: reminder.notifyViaEmail || false,
        notifyViaPush: reminder.notifyViaPush ?? true,
        goalId: '',
        keyAreaId: '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        reminderDateTime: '',
        recurrencePattern: 'none',
        recurrenceEndDate: '',
        notifyViaEmail: false,
        notifyViaPush: true,
        goalId: defaultGoalId || '',
        keyAreaId: defaultKeyAreaId || '',
      });
    }
    setError(null);
  }, [reminder, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        setError('Title is required');
        setLoading(false);
        return;
      }

      if (!formData.reminderDateTime) {
        setError('Reminder date and time is required');
        setLoading(false);
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description || null,
        reminderDateTime: formData.reminderDateTime,
        recurrencePattern: formData.recurrencePattern,
        recurrenceEndDate: formData.recurrenceEndDate || null,
        notifyViaEmail: formData.notifyViaEmail,
        notifyViaPush: formData.notifyViaPush,
        ...(formData.goalId && { goalId: formData.goalId }),
        ...(formData.keyAreaId && { keyAreaId: formData.keyAreaId }),
      };

      let result;
      if (reminder?.id) {
        result = await remindersService.update(reminder.id, payload);
      } else {
        result = await remindersService.create(payload);
      }

      if (onSave) {
        onSave(result);
      }

      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save reminder');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {reminder ? 'Edit Reminder' : 'Create Reminder'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Meeting with team"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional reminder details"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Reminder Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder Date & Time *
            </label>
            <input
              type="datetime-local"
              name="reminderDateTime"
              value={formData.reminderDateTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Recurrence Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repeat
            </label>
            <select
              name="recurrencePattern"
              value={formData.recurrencePattern}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {remindersService.getRecurrencePatterns().map(pattern => (
                <option key={pattern.value} value={pattern.value}>
                  {pattern.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recurrence End Date */}
          {formData.recurrencePattern !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Repeating On
              </label>
              <input
                type="date"
                name="recurrenceEndDate"
                value={formData.recurrenceEndDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          )}

          {/* Notification Settings */}
          <div className="bg-gray-50 p-3 rounded-md space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="notifyViaPush"
                checked={formData.notifyViaPush}
                onChange={handleInputChange}
                disabled={loading}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Browser notification</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="notifyViaEmail"
                checked={formData.notifyViaEmail}
                onChange={handleInputChange}
                disabled={loading}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Email notification</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
              {reminder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
