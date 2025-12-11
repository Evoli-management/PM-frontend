import React from 'react';
import RemindersList from '../components/reminders/RemindersList';

export default function RemindersPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <RemindersList />
      </div>
    </div>
  );
}
