// src/components/shared/Toast.jsx
import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const Toast = ({ type = 'success', message, onClose, autoClose = 3000 }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="w-4 h-4" />;
      case 'error':
      case 'warning':
        return <FaExclamationTriangle className="w-4 h-4" />;
      default:
        return <FaCheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out`}>
      <div className={`flex items-center p-4 rounded-lg border shadow-lg ${getToastStyles()}`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
        >
          <FaTimes className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default Toast;