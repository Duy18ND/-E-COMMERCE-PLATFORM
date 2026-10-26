import { ORDER_STATUS } from '../../utils/constants';

const statusConfig = {
  [ORDER_STATUS.PENDING]: { label: 'Chờ xử lý', color: '#92400e', bg: '#fef3c7' },
  [ORDER_STATUS.PAID]: { label: 'Đã thanh toán', color: '#1e40af', bg: '#dbeafe' },
  [ORDER_STATUS.SHIPPING]: { label: 'Đang giao hàng', color: '#6b21a8', bg: '#f3e8ff' },
  [ORDER_STATUS.COMPLETED]: { label: 'Hoàn thành', color: '#166534', bg: '#dcfce7' },
  [ORDER_STATUS.CANCELLED]: { label: 'Đã hủy', color: '#991b1b', bg: '#fee2e2' },

  // Giữ fallback cho các tên cũ nếu có dữ liệu lịch sử
  PROCESSING: { label: 'Đang xử lý', color: '#1e40af', bg: '#dbeafe' },
  SHIPPED: { label: 'Đang giao hàng', color: '#6b21a8', bg: '#f3e8ff' },
  DELIVERED: { label: 'Hoàn thành', color: '#166534', bg: '#dcfce7' }
};

const OrderStatus = ({ status }) => {
  const current = statusConfig[status] || {
    label: status || 'Không xác định',
    color: '#475569',
    bg: '#f1f5f9'
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: current.color,
        backgroundColor: current.bg
      }}
    >
      {current.label}
    </span>
  );
};

export default OrderStatus;
