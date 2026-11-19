import { ORDER_STATUS } from '../../utils/constants';
import Icon from '../common/Icons';

const statusConfig = {
  [ORDER_STATUS.PENDING]: { label: 'Chờ xác nhận', color: '#92400e', bg: '#fef3c7', icon: 'clock' },
  [ORDER_STATUS.PAID]: { label: 'Đã thanh toán', color: '#1e40af', bg: '#dbeafe', icon: 'payment' },
  [ORDER_STATUS.CONFIRMED]: { label: 'Đã xác nhận', color: '#3730a3', bg: '#e0e7ff', icon: 'approved' },
  [ORDER_STATUS.PROCESSING]: { label: 'Đang xử lý', color: '#0369a1', bg: '#e0f2fe', icon: 'package' },
  [ORDER_STATUS.SHIPPING]: { label: 'Đang giao hàng', color: '#6b21a8', bg: '#f3e8ff', icon: 'shipping' },
  [ORDER_STATUS.DELIVERED]: { label: 'Hoàn thành', color: '#166534', bg: '#dcfce7', icon: 'success' },
  [ORDER_STATUS.CANCELLED]: { label: 'Đã hủy', color: '#991b1b', bg: '#fee2e2', icon: 'x-circle' },
  [ORDER_STATUS.FAILED]: { label: 'Thất bại', color: '#b91c1c', bg: '#fee2e2', icon: 'warning' },
  [ORDER_STATUS.REFUNDED]: { label: 'Đã hoàn tiền', color: '#475569', bg: '#f1f5f9', icon: 'history' },

  // Giữ fallback cho các tên cũ nếu có
  COMPLETED: { label: 'Hoàn thành', color: '#166534', bg: '#dcfce7', icon: 'success' },
  SHIPPED: { label: 'Đang giao hàng', color: '#6b21a8', bg: '#f3e8ff', icon: 'shipping' }
};

const OrderStatus = ({ status }) => {
  const current = statusConfig[status] || {
    label: status || 'Không xác định',
    color: '#475569',
    bg: '#f1f5f9',
    icon: 'info'
  };

  return (
    <span
      className="ui-status-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: current.color,
        backgroundColor: current.bg,
        whiteSpace: 'nowrap'
      }}
    >
      <Icon name={current.icon} size={13} strokeWidth={2.1} />
      <span>{current.label}</span>
    </span>
  );
};

export default OrderStatus;
