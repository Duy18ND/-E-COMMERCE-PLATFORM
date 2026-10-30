import { useState, useEffect, useMemo, useCallback } from 'react';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from '../../components/order/OrderStatus';
import { ORDER_STATUS } from '../../utils/constants';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/admin/Pagination';

// Quy trình chuyển đổi trạng thái đơn hàng chuẩn đồng bộ với Backend
const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [
    { target: ORDER_STATUS.PAID, label: '✓ Xác nhận & Đã thanh toán', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.PAID]: [
    { target: ORDER_STATUS.SHIPPING, label: '🚚 Bàn giao vận chuyển', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.SHIPPING]: [
    { target: ORDER_STATUS.COMPLETED, label: '✓ Xác nhận giao thành công', variant: 'success' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Giao thất bại / Hủy đơn', variant: 'danger' }
  ],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: []
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  // Tải danh sách đơn hàng từ Backend GET /api/admin/orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const data = await orderService.getAllOrders(params);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đơn hàng từ máy chủ!');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === ORDER_STATUS.PENDING).length;
    const paid = orders.filter((o) => o.status === ORDER_STATUS.PAID).length;
    const shipping = orders.filter((o) => o.status === ORDER_STATUS.SHIPPING).length;
    const completed = orders.filter((o) => o.status === ORDER_STATUS.COMPLETED).length;
    return { total, pending, paid, shipping, completed };
  }, [orders]);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const term = searchTerm.toLowerCase().trim();
        const customerName = (order.receiverName || order.userEmail || '').toLowerCase();
        const phone = order.receiverPhone || '';
        const orderId = String(order.id || '');

        const matchSearch =
          orderId.includes(term) ||
          customerName.includes(term) ||
          phone.includes(term);

        const matchStatus = statusFilter ? order.status === statusFilter : true;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'amount_desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
        if (sortBy === 'amount_asc') return (a.totalAmount || 0) - (b.totalAmount || 0);
        return 0;
      });
  }, [orders, searchTerm, statusFilter, sortBy]);

  // Paginated slice
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortBy('');
    setCurrentPage(1);
  };

  // Cập nhật trạng thái gọi API Backend PUT /api/admin/orders/{orderId}/status
  const handleTransitionStatus = async (orderId, targetStatus, actionLabel) => {
    if (!window.confirm(`Xác nhận chuyển trạng thái đơn hàng #${orderId} sang: "${actionLabel}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const updatedOrder = await orderService.updateOrderStatus(orderId, targetStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updatedOrder, status: targetStatus } : o))
      );
    } catch (err) {
      alert(`Lỗi khi cập nhật trạng thái: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Quản lý đơn hàng (Admin)</h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Xử lý và phê duyệt đơn hàng theo quy trình chuẩn
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading || actionLoading}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#2563eb'
          }}
        >
          🔄 Làm mới dữ liệu
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {/* SƠ ĐỒ TIẾN TRÌNH QUY TRÌNH CHUẨN BACKEND */}
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
          🔄 Quy trình xử lý đơn hàng hệ thống:
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
            1. PENDING (Chờ xử lý)
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ padding: '4px 10px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '6px', fontWeight: 600 }}>
            2. PAID (Đã thanh toán)
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ padding: '4px 10px', backgroundColor: '#f3e8ff', color: '#6b21a8', borderRadius: '6px', fontWeight: 600 }}>
            3. SHIPPING (Đang giao hàng)
          </span>
          <span style={{ color: '#94a3b8' }}>➔</span>
          <span style={{ padding: '4px 10px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', fontWeight: 600 }}>
            4. COMPLETED (Hoàn thành)
          </span>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
            * Ở các bước 1, 2, 3 có thể chọn "Hủy đơn" (CANCELLED)
          </div>
        </div>
      </div>

      {/* QUICK STATUS METRICS */}
      <div className="grid-cols-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng đơn hàng</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
            {metrics.total}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>1. Chờ xử lý</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
            {metrics.pending}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>2. Đã thanh toán / Đang giao</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
            {metrics.paid + metrics.shipping}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>4. Đã hoàn thành</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
            {metrics.completed}
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
        <div className="admin-toolbar-grid" style={{ gap: '0.85rem' }}>
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
              onChange={handleSearchChange}
              placeholder="Tìm theo mã đơn (#1), tên người nhận hoặc số điện thoại..."
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
            onChange={handleStatusFilterChange}
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
            <option value={ORDER_STATUS.PENDING}>1. PENDING (Chờ xử lý)</option>
            <option value={ORDER_STATUS.PAID}>2. PAID (Đã thanh toán)</option>
            <option value={ORDER_STATUS.SHIPPING}>3. SHIPPING (Đang giao hàng)</option>
            <option value={ORDER_STATUS.COMPLETED}>4. COMPLETED (Hoàn thành)</option>
            <option value={ORDER_STATUS.CANCELLED}>Đã hủy (CANCELLED)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={handleSortChange}
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
        {loading ? (
          <div style={{ padding: '3rem' }}>
            <Loading message="Đang tải danh sách đơn hàng quản trị..." />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📑</div>
            <p style={{ fontWeight: 600 }}>Không tìm thấy đơn hàng nào phù hợp</p>
            <p style={{ fontSize: '0.85rem' }}>Thử thay đổi từ khóa tìm kiếm hoặc chọn trạng thái khác</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Người nhận</th>
                  <th>Số điện thoại</th>
                  <th>Ngày đặt</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái hiện tại</th>
                  <th style={{ minWidth: '260px' }}>Hành động theo quy trình</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const allowedTransitions = ORDER_TRANSITIONS[order.status] || [];
                  const isCompleted = order.status === ORDER_STATUS.COMPLETED;
                  const isCancelled = order.status === ORDER_STATUS.CANCELLED;

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700 }}>#{order.id}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        {order.receiverName || order.userEmail}
                      </td>
                      <td>{order.receiverPhone || '---'}</td>
                      <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '---'}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>
                        {formatCurrency(order.totalAmount || 0)}
                      </td>
                      <td>
                        <OrderStatus status={order.status} />
                      </td>
                      <td>
                        {/* QUY TRÌNH CHUYỂN TRẠNG THÁI */}
                        {isCompleted ? (
                          <span style={{ color: '#166534', fontSize: '0.825rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                                disabled={actionLoading}
                                onClick={() => handleTransitionStatus(order.id, trans.target, trans.label)}
                                style={{
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  border: trans.variant === 'danger' ? '1px solid #fecaca' : '1px solid #bfdbfe',
                                  backgroundColor: trans.variant === 'danger' ? '#fef2f2' : trans.variant === 'success' ? '#dcfce7' : '#eff6ff',
                                  color: trans.variant === 'danger' ? '#dc2626' : trans.variant === 'success' ? '#166534' : '#1d4ed8',
                                  transition: 'all 0.15s ease'
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

          {/* REUSABLE PAGINATION */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 10, 20, 50]}
            unitName="đơn hàng"
          />
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
