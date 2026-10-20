import { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from '../../components/order/OrderStatus';
import { ORDER_STATUS } from '../../utils/constants';
import Button from '../../components/common/Button';

// Định nghĩa quy trình chuyển trạng thái đơn hàng chuẩn E-Commerce
const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [
    { target: ORDER_STATUS.PROCESSING, label: '✓ Duyệt đơn (Chuyển sang Đang xử lý)', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.PROCESSING]: [
    { target: ORDER_STATUS.SHIPPED, label: '🚚 Bàn giao (Chuyển sang Đang giao)', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.SHIPPED]: [
    { target: ORDER_STATUS.DELIVERED, label: '✓ Xác nhận đã giao thành công', variant: 'success' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Giao thất bại / Hủy đơn', variant: 'danger' }
  ],
  [ORDER_STATUS.DELIVERED]: [], // Trạng thái cuối: Hoàn thành (không được đổi)
  [ORDER_STATUS.CANCELLED]: []  // Trạng thái cuối: Đã hủy (không được đổi)
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([
    {
      id: '1001',
      customerName: 'Nguyễn Văn A',
      phone: '0912345678',
      totalAmount: 28990000,
      status: ORDER_STATUS.PROCESSING,
      createdAt: new Date().toISOString()
    },
    {
      id: '1002',
      customerName: 'Trần Thị B',
      phone: '0987654321',
      totalAmount: 1850000,
      status: ORDER_STATUS.PENDING,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: '1003',
      customerName: 'Lê Văn C',
      phone: '0901122334',
      totalAmount: 3490000,
      status: ORDER_STATUS.DELIVERED,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: '1004',
      customerName: 'Phạm Thị D',
      phone: '0933445566',
      totalAmount: 49990000,
      status: ORDER_STATUS.SHIPPED,
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      id: '1005',
      customerName: 'Vũ Văn E',
      phone: '0977889900',
      totalAmount: 560000,
      status: ORDER_STATUS.CANCELLED,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
    }
  ]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === ORDER_STATUS.PENDING).length;
    const processing = orders.filter((o) => o.status === ORDER_STATUS.PROCESSING).length;
    const shipped = orders.filter((o) => o.status === ORDER_STATUS.SHIPPED).length;
    const delivered = orders.filter((o) => o.status === ORDER_STATUS.DELIVERED).length;
    return { total, pending, processing, shipped, delivered };
  }, [orders]);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const term = searchTerm.toLowerCase().trim();
        const matchSearch =
          order.id.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term) ||
          order.phone.includes(term);

        const matchStatus = statusFilter ? order.status === statusFilter : true;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
        if (sortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
        return 0;
      });
  }, [orders, searchTerm, statusFilter, sortBy]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortBy('');
  };

  // Cập nhật trạng thái theo quy trình có xác nhận
  const handleTransitionStatus = (orderId, targetStatus, actionLabel) => {
    if (window.confirm(`Xác nhận chuyển trạng thái đơn hàng #${orderId} sang: "${actionLabel}"?`)) {
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: targetStatus } : o))
      );
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Quản lý đơn hàng</h1>
        <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
          Xử lý đơn hàng theo đúng quy trình nghiệp vụ chuẩn
        </p>
      </div>

      {/* SƠ ĐỒ TIẾN TRÌNH QUY TRÌNH CHUẨN */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe'
        }}
      >
        <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
          🔄 Quy trình xử lý đơn hàng chuẩn:
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}
        >
          <span style={{ padding: '4px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '6px', fontWeight: 600 }}>
            1. Chờ xác nhận
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ padding: '4px 10px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '6px', fontWeight: 600 }}>
            2. Đang xử lý
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ padding: '4px 10px', backgroundColor: '#f3e8ff', color: '#6b21a8', borderRadius: '6px', fontWeight: 600 }}>
            3. Đang giao hàng
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ padding: '4px 10px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', fontWeight: 600 }}>
            4. Đã giao thành công (Kết thúc)
          </span>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
            * Ở các bước 1, 2, 3 có thể chọn "Hủy đơn" (Kết thúc)
          </div>
        </div>
      </div>

      {/* QUICK STATUS METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng đơn hàng</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {metrics.total}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>1. Chờ xác nhận</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
            {metrics.pending}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>2. Đang xử lý</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
            {metrics.processing}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>4. Đã giao thành công</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
            {metrics.delivered}
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER TOOLBAR */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.85rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '0.9rem'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn (#1001), tên khách hoặc số điện thoại..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value={ORDER_STATUS.PENDING}>1. Chờ xác nhận</option>
            <option value={ORDER_STATUS.PROCESSING}>2. Đang xử lý</option>
            <option value={ORDER_STATUS.SHIPPED}>3. Đang giao hàng</option>
            <option value={ORDER_STATUS.DELIVERED}>4. Đã giao thành công</option>
            <option value={ORDER_STATUS.CANCELLED}>Đã hủy đơn</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">Sắp xếp: Mặc định</option>
            <option value="date_desc">Ngày đặt: Mới nhất</option>
            <option value="date_asc">Ngày đặt: Cũ nhất</option>
            <option value="amount_desc">Tổng tiền: Cao đến Thấp</option>
            <option value="amount_asc">Tổng tiền: Thấp đến Cao</option>
          </select>
        </div>

        {/* Filter stats & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>
            Hiển thị <strong>{filteredOrders.length}</strong> / {orders.length} đơn hàng
          </span>
          {(searchTerm || statusFilter || sortBy) && (
            <button
              onClick={handleResetFilter}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              🔄 Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="card" style={{ padding: 0 }}>
        {filteredOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📑</div>
            <p style={{ fontWeight: 600 }}>Không tìm thấy đơn hàng nào phù hợp</p>
            <p style={{ fontSize: '0.85rem' }}>Thử thay đổi từ khóa tìm kiếm hoặc chọn trạng thái khác</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Ngày đặt</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái hiện tại</th>
                  <th style={{ minWidth: '260px' }}>Hành động theo quy trình</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const allowedTransitions = ORDER_TRANSITIONS[order.status] || [];
                  const isCompleted = order.status === ORDER_STATUS.DELIVERED;
                  const isCancelled = order.status === ORDER_STATUS.CANCELLED;

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700 }}>#{order.id}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{order.customerName}</td>
                      <td>{order.phone}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td>
                        <OrderStatus status={order.status} />
                      </td>
                      <td>
                        {/* QUY TRÌNH CHUYỂN TRẠNG THÁI */}
                        {isCompleted ? (
                          <span style={{ color: '#16a34a', fontSize: '0.825rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>✓</span> Đơn hàng hoàn tất (Khóa)
                          </span>
                        ) : isCancelled ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.825rem', fontStyle: 'italic' }}>
                            ✕ Đã hủy (Khóa)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {allowedTransitions.map((trans) => (
                              <button
                                key={trans.target}
                                onClick={() => handleTransitionStatus(order.id, trans.target, trans.label)}
                                style={{
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  border: trans.variant === 'danger' ? '1px solid #fecaca' : '1px solid #bfdbfe',
                                  backgroundColor: trans.variant === 'danger' ? '#fef2f2' : trans.variant === 'success' ? '#dcfce7' : '#eff6ff',
                                  color: trans.variant === 'danger' ? '#dc2626' : trans.variant === 'success' ? '#166534' : '#1d4ed8',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.85';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                }}
                              >
                                {trans.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
