import { createContext, useState, useCallback, useRef, useMemo } from 'react';
import ToastContainer from '../components/common/ToastContainer';
import ConfirmModal from '../components/common/ConfirmModal';
import ResultModal from '../components/common/ResultModal';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  // Toast notifications state
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const lastToastRef = useRef({ text: '', time: 0 });

  // Confirm Modal state (managed via Promise)
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy bỏ',
    loading: false
  });
  const confirmResolveRef = useRef(null);

  // Result Modal state (managed via Promise)
  const [resultState, setResultState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'success',
    confirmText: 'Đóng',
    action: null
  });
  const resultResolveRef = useRef(null);

  // ─── TOAST LOGIC ─────────────────────────────────────────────────────────────
  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, closing: true } : t))
    );

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
      // Deduplication: Ngăn chặn gửi 2 thông báo y hệt nhau trong vòng 800ms
      const textKey = `${type}-${title}-${message}`;
      const now = Date.now();
      if (
        lastToastRef.current.text === textKey &&
        now - lastToastRef.current.time < 800
      ) {
        return null;
      }
      lastToastRef.current = { text: textKey, time: now };

      const id = `${now}-${Math.random().toString(36).substring(2, 9)}`;

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

  // Cung cấp object notify tiện lợi: notify.success, notify.error, notify.warning, notify.info, notify.cart
  const notify = useMemo(
    () => ({
      success: (message, options = {}) =>
        showToast({
          type: 'success',
          title: options.title || 'Thành công',
          message,
          duration: options.duration ?? 3500,
          action: options.action ?? null
        }),
      error: (message, options = {}) =>
        showToast({
          type: 'error',
          title: options.title || 'Đã xảy ra lỗi',
          message: typeof message === 'string' ? message : message?.message || 'Có lỗi xảy ra',
          duration: options.duration ?? 5000,
          action: options.action ?? null
        }),
      warning: (message, options = {}) =>
        showToast({
          type: 'warning',
          title: options.title || 'Cảnh báo',
          message,
          duration: options.duration ?? 4000,
          action: options.action ?? null
        }),
      info: (message, options = {}) =>
        showToast({
          type: 'info',
          title: options.title || 'Thông báo',
          message,
          duration: options.duration ?? 3500,
          action: options.action ?? null
        }),
      cart: (product, quantity = 1, options = {}) =>
        showToast({
          type: 'cart',
          title: options.title || 'Đã thêm vào giỏ hàng!',
          product,
          quantity,
          duration: options.duration ?? 4000
        })
    }),
    [showToast]
  );

  // ─── CONFIRM MODAL (PROMISE-BASED) ──────────────────────────────────────────
  /**
   * confirmDialog - Mở popup xác nhận không dùng window.confirm()
   * @example
   * const ok = await confirmDialog({
   *   title: 'Xác nhận xóa',
   *   message: 'Bạn có chắc chắn muốn xóa?',
   *   variant: 'danger',
   *   confirmText: 'Xóa vĩnh viễn'
   * });
   * if (!ok) return;
   */
  const confirmDialog = useCallback((options = {}) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({
        isOpen: true,
        title: options.title || 'Xác nhận hành động',
        message: options.message || 'Bạn có chắc chắn muốn thực hiện hành động này không?',
        variant: options.variant || 'primary',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy bỏ',
        loading: false
      });
    });
  }, []);

  const handleConfirmAction = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
  }, []);

  const handleCancelAction = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
  }, []);

  // ─── RESULT MODAL (PROMISE-BASED) ───────────────────────────────────────────
  /**
   * showResultModal - Mở popup kết quả quan trọng (Đặt hàng thành công, Báo cáo...)
   */
  const showResultModal = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resultResolveRef.current = resolve;
      setResultState({
        isOpen: true,
        title: options.title || 'Thông báo kết quả',
        message: options.message || '',
        variant: options.variant || 'success',
        confirmText: options.confirmText || 'Đóng',
        action: options.action || null
      });
    });
  }, []);

  const handleCloseResultModal = useCallback(() => {
    setResultState((prev) => ({ ...prev, isOpen: false }));
    if (resultResolveRef.current) {
      resultResolveRef.current();
      resultResolveRef.current = null;
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      showToast,
      removeToast,
      notify,
      confirmDialog,
      showResultModal
    }),
    [showToast, removeToast, notify, confirmDialog, showResultModal]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Global Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        loading={confirmState.loading}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />

      {/* Global Result Modal */}
      <ResultModal
        isOpen={resultState.isOpen}
        title={resultState.title}
        message={resultState.message}
        variant={resultState.variant}
        confirmText={resultState.confirmText}
        action={resultState.action}
        onClose={handleCloseResultModal}
      />
    </ToastContext.Provider>
  );
};

export default ToastContext;
