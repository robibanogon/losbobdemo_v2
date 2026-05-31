/**
 * @fileoverview Toast Context - Global toast notification system
 * @module context/ToastContext
 * @description Provides toast notification context with methods to display
 * success, error, warning, and info messages. Auto-dismisses after 5 seconds.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

/**
 * Custom hook to access toast context
 * @returns {Object} Toast context value with notification methods
 * @throws {Error} If used outside ToastProvider
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

/**
 * Toast Provider Component
 * Manages toast notifications and provides notification methods
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component with toast container
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  /**
   * Add a new toast notification
   * @param {string} message - Toast message
   * @param {string} [type='info'] - Toast type (success, error, warning, info)
   * @returns {number} Toast ID
   */
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
    
    return id;
  }, []);

  /**
   * Remove a toast notification by ID
   * @param {number} id - Toast ID to remove
   */
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message) => addToast(message, 'error'), [addToast]);
  const warning = useCallback((message) => addToast(message, 'warning'), [addToast]);
  const info = useCallback((message) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Toast Container Component
 * Renders all active toast notifications
 * @param {Object} props - Component props
 * @param {Array} props.toasts - Array of toast objects
 * @param {Function} props.removeToast - Function to remove a toast
 * @returns {JSX.Element|null} Container with toasts or null if no toasts
 */
const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px'
    }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

/**
 * Individual Toast Component
 * Renders a single toast notification with close button
 * @param {Object} props - Component props
 * @param {Object} props.toast - Toast object with id, message, and type
 * @param {Function} props.onClose - Function to close the toast
 * @returns {JSX.Element} Toast notification element
 */
const Toast = ({ toast, onClose }) => {
  const colors = {
    success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
    error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
    warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
    info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
  };

  const color = colors[toast.type] || colors.info;

  return (
    <div style={{
      backgroundColor: color.bg,
      border: `1px solid ${color.border}`,
      color: color.text,
      padding: '12px 16px',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      animation: 'slideIn 0.3s ease-out',
      minWidth: '300px'
    }}>
      <span style={{ flex: 1, marginRight: '10px' }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: color.text,
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
      >
        ×
      </button>
    </div>
  );
};

// Made with Bob
