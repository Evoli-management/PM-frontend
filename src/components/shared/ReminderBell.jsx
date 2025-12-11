import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import remindersService from '../../services/remindersService';
import RemindersListModal from '../reminders/RemindersListModal';

export default function ReminderBell() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Load reminder count on mount and periodically
  useEffect(() => {
    loadReminderCount();
    // Refresh every 60 seconds
    const interval = setInterval(loadReminderCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadReminderCount = async () => {
    try {
      setLoading(true);
      const reminders = await remindersService.list();
      // Count only pending reminders
      const pendingCount = reminders.filter(r => r.status === 'pending').length;
      setCount(pendingCount);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="relative p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title={count > 0 ? `${count} pending reminder(s)` : 'No pending reminders'}
        aria-label="Reminders"
      >
        <FaBell size={20} />
        {count > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Reminders Modal */}
      <RemindersListModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
