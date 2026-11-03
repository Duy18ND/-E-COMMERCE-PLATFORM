import { useContext } from 'react';
import ToastContext from '../context/ToastContext';

/**
 * useNotification - Hook tiện ích quản lý toàn bộ hệ thống thông báo của ShopMart
 * Hỗ trợ Toast thông báo nhanh, Confirm Modal xác nhận và Result Modal kết quả.
 *
 * @example
 * const { notify, confirmDialog, showResultModal } = useNotification();
 * notify.success('Thành công!');
 * const ok = await confirmDialog({ title: 'Xác nhận xóa', variant: 'danger' });
 */
export const useNotification = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useNotification must be used within a ToastProvider');
  }
  return context;
};

export default useNotification;
