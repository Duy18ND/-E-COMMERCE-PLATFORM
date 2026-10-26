import { createContext, useState, useCallback, useRef } from 'react';
import ToastContainer from '../components/common/ToastContainer';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    // Clear timer if still running
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    // Trigger closing animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, closing: true } : t))
    );

    // After animation finishes, remove completely
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const showToast = useCallback(
    ({
      type = 'info',
      title = '',
      message = '',
      product = null,
      quantity = 1,
      duration = 3500,
      action = null
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newToast = {
        id,
        type,
        title,
        message,
        product,
        quantity,
        duration,
        action,
        closing: false
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current[id] = timer;
      }

      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastContext;
