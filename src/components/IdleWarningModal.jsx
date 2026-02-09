import React from 'react';

/**
 * Modal to warn user about idle session timeout
 * TC011: Session timeout warning
 */
const IdleWarningModal = ({ isOpen, onContinue, onLogout, timeRemaining }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/20 backdrop-blur-[1px] animate-fadeIn">
      <div className="bg-white rounded-xl p-8 max-w-md w-[90%] shadow-2xl text-center animate-slideUp">
        <div className="text-5xl mb-4">⏰</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Session Expiring Soon
        </h2>
        <p className="text-base text-gray-600 mb-2 leading-relaxed">
          You've been inactive for a while. Your session will expire in {timeRemaining} minutes
          for your security.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Would you like to continue your session?
        </p>
        <div className="flex gap-4 justify-center">
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            onClick={onContinue}
          >
            Continue Session
          </button>
          <button
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdleWarningModal;
