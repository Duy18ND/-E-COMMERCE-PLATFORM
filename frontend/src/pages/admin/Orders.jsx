import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from '../../components/order/OrderStatus';
import OrderTimeline from '../../components/order/OrderTimeline';
import { ORDER_STATUS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../utils/constants';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/admin/Pagination';
import useNotification from '../../hooks/useNotification';

// Danh sách các trạng thái Backend hỗ trợ cho bộ lọc ECOM-291
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: ORDER_STATUS.PENDING, label: 'Chờ xác nhận (PENDING)' },
  { value: ORDER_STATUS.PAID, label: 'Đã thanh toán (PAID)' },
  { value: ORDER_STATUS.CONFIRMED, label: 'Đã xác nhận (CONFIRMED)' },
  { value: ORDER_STATUS.PROCESSING, label: 'Đang xử lý (PROCESSING)' },
  { value: ORDER_STATUS.SHIPPING, label: 'Đang giao hàng (SHIPPING)' },
  { value: ORDER_STATUS.DELIVERED, label: 'Hoàn thành (DELIVERED)' },
  { value: ORDER_STATUS.CANCELLED, label: 'Đã hủy (CANCELLED)' },
  { value: ORDER_STATUS.FAILED, label: 'Thất bại (FAILED)' },
  { value: ORDER_STATUS.REFUNDED, label: 'Đã hoàn tiền (REFUNDED)' }
];

// Danh sách nút bộ lọc nhanh (Quick Filter Pills)
const QUICK_FILTER_TABS = [
  { value: '', label: 'Tất cả' },
  { value: ORDER_STATUS.PENDING, label: 'Chờ xác nhận' },
  { value: ORDER_STATUS.PAID, label: 'Đã thanh toán' },
  { value: ORDER_STATUS.CONFIRMED, label: 'Đã xác nhận' },
  { value: ORDER_STATUS.PROCESSING, label: 'Đang xử lý' },
  { value: ORDER_STATUS.SHIPPING, label: 'Đang giao' },
  { value: ORDER_STATUS.DELIVERED, label: 'Hoàn thành' },
  { value: ORDER_STATUS.CANCELLED, label: 'Đã hủy' }
];

// Quy trình chuyển đổi trạng thái đồng bộ với State Machine trong OrderServiceImpl Backend
const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [
    { target: ORDER_STATUS.PAID, label: '✓ Đã thanh toán', variant: 'primary' },
    { target: ORDER_STATUS.CONFIRMED, label: '✓ Xác nhận đơn', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.PAID]: [
    { target: ORDER_STATUS.CONFIRMED, label: '✓ Xác nhận đơn', variant: 'primary' },
    { target: ORDER_STATUS.PROCESSING, label: '📦 Chuẩn bị hàng', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.CONFIRMED]: [
    { target: ORDER_STATUS.PROCESSING, label: '📦 Bắt đầu đóng gói', variant: 'primary' },
    { target: ORDER_STATUS.SHIPPING, label: '🚚 Bàn giao vận chuyển', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.PROCESSING]: [
    { target: ORDER_STATUS.SHIPPING, label: '🚚 Bàn giao vận chuyển', variant: 'primary' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.SHIPPING]: [
    { target: ORDER_STATUS.DELIVERED, label: '✓ Giao thành công (Hoàn thành)', variant: 'success' },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Giao thất bại / Hủy đơn', variant: 'danger' }
  ],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.FAILED]: [],
  [ORDER_STATUS.REFUNDED]: []
};

const AdminOrders = () => {
  const { notify, confirmDialog } = useNotification();
  // Data state
  const [orders, setOrders] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination state (UI: 1-based, Backend Spring Data: 0-based)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Order Detail Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [modalTransitionNote, setModalTransitionNote] = useState('');
  const [modalNoteError, setModalNoteError] = useState('');

  // Table Row Status Transition & Note Modal state
  const [transitionModal, setTransitionModal] = useState(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [transitionNoteError, setTransitionNoteError] = useState('');

  // Race condition guard ref
  const requestIdRef = useRef(0);

  // Tải danh sách đơn hàng từ Backend GET /api/v1/admin/orders
  const fetchOrders = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const params = {
        page: currentPage - 1, // Spring Pageable 0-based
        size: itemsPerPage,
        sortBy: sortBy || 'id',
        sortDir: sortDir || 'desc'
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await orderService.getAllOrders(params);

      // Tránh race condition nếu user bấm chuyển filter liên tục
      if (currentRequestId !== requestIdRef.current) return;

      if (response && Array.isArray(response.content)) {
        setOrders(response.content);
        setTotalElements(response.totalElements ?? response.content.length);
        setTotalPages(response.totalPages ?? 1);
      } else if (Array.isArray(response)) {
        setOrders(response);
        setTotalElements(response.length);
        setTotalPages(Math.max(1, Math.ceil(response.length / itemsPerPage)));
      } else {
        setOrders([]);
        setTotalElements(0);
        setTotalPages(1);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err.message || 'Không thể tải danh sách đơn hàng từ máy chủ. Vui lòng thử lại!');
        setOrders([]);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentPage, itemsPerPage, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Bộ lọc tìm kiếm Client-side bổ trợ (Mã đơn, Tên khách hàng, SĐT)
  const displayedOrders = useMemo(() => {
    if (!searchTerm.trim()) {
      return orders;
    }
    const term = searchTerm.toLowerCase().trim();
    return orders.filter((order) => {
      const orderId = String(order.id || '');
      const customerName = (order.receiverName || order.userEmail || '').toLowerCase();
      const phone = String(order.receiverPhone || '');
      return orderId.includes(term) || customerName.includes(term) || phone.includes(term);
    });
  }, [orders, searchTerm]);

  // Handler khi thay đổi bộ lọc trạng thái -> Đặt lại về trang 1
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  // Handler khi thay đổi tìm kiếm -> Reset về trang 1
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handler khi thay đổi sắp xếp
  const handleSortChange = (e) => {
    const val = e.target.value;
    if (val === 'date_desc') {
      setSortBy('createdAt');
      setSortDir('desc');
    } else if (val === 'date_asc') {
      setSortBy('createdAt');
      setSortDir('asc');
    } else if (val === 'amount_desc') {
      setSortBy('totalAmount');
      setSortDir('desc');
    } else if (val === 'amount_asc') {
      setSortBy('totalAmount');
      setSortDir('asc');
    } else {
      setSortBy('id');
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  // Đặt lại toàn bộ bộ lọc
  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortBy('id');
    setSortDir('desc');
    setCurrentPage(1);
  };

  // Mở modal xem chi tiết đơn hàng
  const handleViewDetail = async (orderSummary) => {
    setSelectedOrder(orderSummary);
    setDetailLoading(true);
    setDetailError('');
    setModalTransitionNote('');
    setModalNoteError('');

    try {
      // Gọi API lấy dữ liệu chi tiết đầy đủ (items, timeline histories)
      const fullDetail = await orderService.getAdminOrderById(orderSummary.id);
      if (fullDetail) {
        setSelectedOrder(fullDetail);
      }
    } catch (err) {
      setDetailError(err.message || 'Không thể lấy đầy đủ chi tiết đơn hàng từ API.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Đóng modal xem chi tiết
  const handleCloseDetail = () => {
    setSelectedOrder(null);
    setDetailError('');
    setModalTransitionNote('');
    setModalNoteError('');
  };

  // Thực thi gọi API cập nhật trạng thái kèm ghi chú (note) và đồng bộ danh sách + modal
  const executeOrderStatusUpdate = async (orderId, targetStatus, actionLabel, noteText = '') => {
    const cleanedNote = String(noteText || '').trim();
    setActionLoading(true);
    try {
      const updatedOrder = await orderService.updateOrderStatus(orderId, targetStatus, cleanedNote);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, ...updatedOrder, status: targetStatus, statusNote: cleanedNote || o.statusNote }
            : o
        )
      );

      // Nếu đang mở modal chi tiết của đơn hàng này thì đồng bộ trạng thái + lịch sử timeline ngay lập tức
      if (selectedOrder && selectedOrder.id === orderId) {
        let freshHistories = updatedOrder?.statusHistories;
        if (!Array.isArray(freshHistories)) {
          try {
            freshHistories = await orderService.getOrderStatusHistory(orderId);
          } catch {
            freshHistories = selectedOrder.statusHistories;
          }
        }
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                ...updatedOrder,
                status: targetStatus,
                statusNote: cleanedNote || prev.statusNote,
                statusHistories: freshHistories
              }
            : null
        );
        setModalTransitionNote('');
        setModalNoteError('');
      }

      notify.success(`Cập nhật đơn hàng #${orderId} sang "${actionLabel}" thành công!`);
      return true;
    } catch (err) {
      notify.error(`Lỗi khi cập nhật trạng thái đơn hàng: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Khi bấm nút chuyển trạng thái từ bảng danh sách -> mở Modal nhập ghi chú / lý do hủy / mã vận đơn
  const handleTransitionStatus = (orderId, targetStatus, actionLabel) => {
    setTransitionModal({ orderId, targetStatus, actionLabel });
    setTransitionNote('');
    setTransitionNoteError('');
  };

  // Xác nhận chuyển trạng thái từ Modal ghi chú của bảng danh sách
  const handleConfirmTableTransition = async () => {
    if (!transitionModal || actionLoading) return;
    const { orderId, targetStatus, actionLabel } = transitionModal;
    const isCancel = targetStatus === ORDER_STATUS.CANCELLED;

    if (isCancel && !transitionNote.trim()) {
      setTransitionNoteError('Vui lòng nhập lý do hủy đơn hàng (bắt buộc).');
      return;
    }

    const ok = await executeOrderStatusUpdate(
      orderId,
      targetStatus,
      actionLabel,
      transitionNote.trim()
    );
    if (ok) {
      setTransitionModal(null);
      setTransitionNote('');
      setTransitionNoteError('');
    }
  };

  // Cập nhật trạng thái trực tiếp ngay trong Modal Chi tiết đơn hàng
  const handleModalStatusUpdate = async (targetStatus, actionLabel) => {
    if (!selectedOrder || actionLoading) return;
    const isDanger = targetStatus === ORDER_STATUS.CANCELLED;

    if (isDanger && !modalTransitionNote.trim()) {
      setModalNoteError('Vui lòng nhập lý do hủy đơn hàng trước khi xác nhận hủy (bắt buộc).');
      return;
    }

    setModalNoteError('');
    const confirmed = await confirmDialog({
      title: isDanger ? 'Xác nhận hủy đơn hàng' : 'Cập nhật trạng thái đơn hàng',
      message: `Bạn có chắc chắn muốn chuyển trạng thái đơn hàng #${selectedOrder.id} sang "${actionLabel}"${modalTransitionNote.trim() ? ` với ghi chú: "${modalTransitionNote.trim()}"` : ''}?`,
      variant: isDanger ? 'danger' : 'primary',
      confirmText: actionLabel,
      cancelText: 'Quay lại'
    });
    if (!confirmed) return;

    await executeOrderStatusUpdate(
      selectedOrder.id,
      targetStatus,
      actionLabel,
      modalTransitionNote.trim()
    );
  };

  // Format nhãn phương thức thanh toán
  const formatPaymentMethod = (method) => {
    if (!method) return 'Chưa xác định';
    return PAYMENT_METHOD_LABELS[method] || method;
  };

  return (
    <div className="admin-orders-page">
      {/* 3.A. TIÊU ĐỀ TRANG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Quản lý đơn hàng</h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0', color: '#64748b' }}>
            Theo dõi và quản lý các đơn hàng trong hệ thống ShopMart.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading || actionLoading}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.55rem 1.1rem',
            cursor: loading || actionLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#2563eb',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          title="Làm mới dữ liệu từ máy chủ"
        >
          <span>🔄</span> {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {/* ERROR STATE: Hiển thị lỗi và nút "Thử lại" theo yêu cầu Mục 4 */}
      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorMessage message={error} onClose={() => setError('')} />
          <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
            <button
              type="button"
              onClick={fetchOrders}
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🔄 Thử lại kết nối
            </button>
          </div>
        </div>
      )}

      {/* 3.C. BỘ LỌC TRẠNG THÁI — THANH TAB NHANH (QUICK FILTER PILLS) */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginRight: '0.25rem' }}>
            Lọc nhanh:
          </span>
          {QUICK_FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => handleStatusFilterChange(tab.value)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? '#2563eb' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* THANH CÔNG CỤ TÌM KIẾM, CHỌN TRẠNG THÁI DROPDOWN VÀ SẮP XẾP */}
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
          {/* Ô tìm kiếm */}
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
              placeholder="Tìm theo mã đơn (#1), tên khách hàng hoặc SĐT..."
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

          {/* 3.C. Bộ lọc trạng thái Dropdown (Đầy đủ các trạng thái Backend) */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
            aria-label="Lọc theo trạng thái đơn hàng"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sắp xếp */}
          <select
            value={
              sortBy === 'createdAt' && sortDir === 'asc'
                ? 'date_asc'
                : sortBy === 'totalAmount' && sortDir === 'desc'
                ? 'amount_desc'
                : sortBy === 'totalAmount' && sortDir === 'asc'
                ? 'amount_asc'
                : 'date_desc'
            }
            onChange={handleSortChange}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
            aria-label="Sắp xếp danh sách đơn hàng"
          >
            <option value="date_desc">Ngày đặt: Mới nhất</option>
            <option value="date_asc">Ngày đặt: Cũ nhất</option>
            <option value="amount_desc">Tổng tiền: Cao đến Thấp</option>
            <option value="amount_asc">Tổng tiền: Thấp đến Cao</option>
          </select>
        </div>

        {/* Thống kê kết quả & Nút đặt lại bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ color: '#64748b' }}>
            Hiển thị <strong>{displayedOrders.length}</strong> / tổng số <strong>{totalElements}</strong> đơn hàng
            {statusFilter && (
              <span> (Trạng thái: <strong>{ORDER_STATUS_LABELS[statusFilter] || statusFilter}</strong>)</span>
            )}
          </span>
          {(searchTerm || statusFilter || sortBy !== 'id') && (
            <button
              type="button"
              onClick={handleResetFilter}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              🔄 Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 3.B. BẢNG DANH SÁCH ĐƠN HÀNG */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* LOADING STATE */}
        {loading ? (
          <div style={{ padding: '3.5rem 1rem' }}>
            <Loading message="Đang tải dữ liệu đơn hàng từ máy chủ..." />
          </div>
        ) : displayedOrders.length === 0 ? (
          /* EMPTY STATE */
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📑</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b', margin: '0 0 0.5rem' }}>
              Không có đơn hàng nào phù hợp
            </p>
            <p style={{ fontSize: '0.875rem', margin: '0 0 1rem' }}>
              {statusFilter
                ? `Không tìm thấy đơn hàng nào ở trạng thái "${ORDER_STATUS_LABELS[statusFilter] || statusFilter}".`
                : 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.'}
            </p>
            {(searchTerm || statusFilter) && (
              <button
                type="button"
                onClick={handleResetFilter}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table orders-table" style={{ minWidth: '980px', width: '100%' }}>
                <thead>
                  <tr>
                    {/* Cột 1: Mã đơn hàng */}
                    <th style={{ width: '80px', minWidth: '75px', whiteSpace: 'nowrap' }}>Mã đơn</th>
                    {/* Cột 2: Tên khách hàng */}
                    <th style={{ minWidth: '150px' }}>Khách hàng</th>
                    {/* Cột 3: Ngày đặt hàng */}
                    <th style={{ minWidth: '135px', whiteSpace: 'nowrap' }}>Ngày đặt hàng</th>
                    {/* Cột 4: Tổng tiền */}
                    <th style={{ minWidth: '130px', whiteSpace: 'nowrap', textAlign: 'right' }}>Tổng tiền</th>
                    {/* Cột 5: Phương thức thanh toán */}
                    <th style={{ minWidth: '115px', whiteSpace: 'nowrap', textAlign: 'center' }}>Phương thức TT</th>
                    {/* Cột 6: Trạng thái đơn hàng */}
                    <th style={{ minWidth: '125px', whiteSpace: 'nowrap', textAlign: 'center' }}>Trạng thái</th>
                    {/* Cột 7: Thao tác xem chi tiết & Cập nhật */}
                    <th style={{ minWidth: '240px', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => {
                    const allowedTransitions = ORDER_TRANSITIONS[order.status] || [];
                    const isDelivered = order.status === ORDER_STATUS.DELIVERED || order.status === 'COMPLETED';
                    const isCancelled = order.status === ORDER_STATUS.CANCELLED;

                    return (
                      <tr key={order.id}>
                        {/* 1. Mã đơn hàng */}
                        <td style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>#{order.id}</td>

                        {/* 2. Tên khách hàng */}
                        <td style={{ minWidth: '150px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {order.receiverName || order.userEmail || `Khách hàng #${order.userId || order.id}`}
                          </div>
                          {order.receiverPhone && (
                            <div style={{ fontSize: '0.775rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                              📞 {order.receiverPhone}
                            </div>
                          )}
                        </td>

                        {/* 3. Ngày đặt hàng */}
                        <td style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap' }}>
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString('vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '---'}
                        </td>

                        {/* 4. Tổng tiền */}
                        <td style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.95rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                            {formatCurrency(order.totalAmount || 0)}
                          </span>
                        </td>

                        {/* 5. Phương thức thanh toán */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.775rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              fontWeight: 600,
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {order.paymentMethod === 'MOCK_ONLINE' ? '💳 Trực tuyến' : '💵 COD'}
                          </span>
                        </td>

                        {/* 6. Trạng thái đơn hàng */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <OrderStatus status={order.status} />
                        </td>

                        {/* 7. Thao tác xem chi tiết & chuyển trạng thái */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                            {/* Nút Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => handleViewDetail(order)}
                              style={{
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                height: '30px',
                                padding: '0 0.65rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#1e293b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                              title="Xem chi tiết đơn hàng"
                            >
                              <span>👁️</span> Chi tiết
                            </button>

                            {/* Các nút chuyển trạng thái theo quy trình */}
                            {allowedTransitions.map((trans) => (
                              <button
                                key={trans.target}
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleTransitionStatus(order.id, trans.target, trans.label)}
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  height: '30px',
                                  padding: '0 0.6rem',
                                  borderRadius: '6px',
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  border:
                                    trans.variant === 'danger'
                                      ? '1px solid #fecaca'
                                      : trans.variant === 'success'
                                      ? '1px solid #bbf7d0'
                                      : '1px solid #bfdbfe',
                                  backgroundColor:
                                    trans.variant === 'danger'
                                      ? '#fef2f2'
                                      : trans.variant === 'success'
                                      ? '#f0fdf4'
                                      : '#eff6ff',
                                  color:
                                    trans.variant === 'danger'
                                      ? '#dc2626'
                                      : trans.variant === 'success'
                                      ? '#166534'
                                      : '#1d4ed8',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {trans.label}
                              </button>
                            ))}

                            {isDelivered && (
                              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, height: '30px', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', padding: '0 0.25rem' }}>
                                ✓ Hoàn tất
                              </span>
                            )}
                            {isCancelled && (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', height: '30px', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', padding: '0 0.25rem' }}>
                                ✕ Đã hủy
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 3.D. PHÂN TRANG (PAGINATION) */}
            <Pagination
              currentPage={currentPage}
              totalItems={totalElements}
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

      {/* 3.E. MODAL XEM CHI TIẾT ĐƠN HÀNG */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={handleCloseDetail}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 2
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  Chi tiết đơn hàng #{selectedOrder.id}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Đặt lúc:{' '}
                  {selectedOrder.createdAt
                    ? new Date(selectedOrder.createdAt).toLocaleString('vi-VN')
                    : '---'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  lineHeight: 1
                }}
                aria-label="Đóng chi tiết"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {detailLoading && (
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                  <Loading message="Đang tải đầy đủ chi tiết sản phẩm..." />
                </div>
              )}

              {detailError && <ErrorMessage message={detailError} />}

              {/* Thông tin khách hàng & Giao nhận */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.85rem',
                  fontSize: '0.875rem'
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.775rem', display: 'block' }}>Khách hàng / Người nhận</span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedOrder.receiverName || selectedOrder.userEmail || `User #${selectedOrder.userId}`}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.775rem', display: 'block' }}>Số điện thoại</span>
                  <strong style={{ color: '#0f172a' }}>{selectedOrder.receiverPhone || '---'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.775rem', display: 'block' }}>Phương thức thanh toán</span>
                  <strong style={{ color: '#0f172a' }}>{formatPaymentMethod(selectedOrder.paymentMethod)}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.775rem', display: 'block' }}>Trạng thái hiện tại</span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <OrderStatus status={selectedOrder.status} />
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: '#64748b', fontSize: '0.775rem', display: 'block' }}>Địa chỉ giao hàng</span>
                  <span style={{ color: '#0f172a' }}>{selectedOrder.shippingAddress || 'Chưa cung cấp'}</span>
                </div>
              </div>

              {/* Danh sách sản phẩm trong đơn */}
              <div>
                <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                  Danh sách sản phẩm ({(selectedOrder.items || []).length})
                </h4>
                {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Chưa có thông tin danh sách sản phẩm chi tiết của đơn hàng này.
                  </p>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                        <tr>
                          <th style={{ padding: '0.65rem 0.85rem' }}>Sản phẩm</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>SL</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={item.id || idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>
                              {item.productName || item.name || `Sản phẩm #${item.productId}`}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: '#475569' }}>
                              {formatCurrency(item.priceAtPurchase || item.price || 0)}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 600 }}>
                              {item.quantity || 1}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                              {formatCurrency(item.subTotal || ((item.priceAtPurchase || item.price || 0) * (item.quantity || 1)))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Tổng tiền đơn hàng */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1e40af' }}>Tổng cộng tiền thanh toán:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e40af' }}>
                  {formatCurrency(selectedOrder.totalAmount || 0)}
                </span>
              </div>

              {/* CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG TRỰC TIẾP TRONG MODAL CHI TIẾT */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '1rem 1.15rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    ⚡ Cập nhật trạng thái đơn hàng
                  </h4>
                  <OrderStatus status={selectedOrder.status} />
                </div>

                {(ORDER_TRANSITIONS[selectedOrder.status] || []).length === 0 ? (
                  <div
                    style={{
                      fontSize: '0.825rem',
                      color: '#64748b',
                      backgroundColor: '#f8fafc',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    🔒 Đơn hàng đang ở trạng thái cuối (<strong>{ORDER_STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</strong>) nên không thể chuyển đổi thêm.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#334155',
                          marginBottom: '0.35rem'
                        }}
                      >
                        Ghi chú chuyển trạng thái / Mã vận đơn / Lý do hủy đơn{' '}
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>
                          (Bắt buộc nếu Hủy đơn)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={modalTransitionNote}
                        onChange={(e) => {
                          setModalTransitionNote(e.target.value);
                          if (modalNoteError) setModalNoteError('');
                        }}
                        placeholder="Nhập ghi chú xử lý, mã vận đơn giao hàng hoặc lý do hủy đơn..."
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '8px',
                          border: modalNoteError ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                          backgroundColor: modalNoteError ? '#fef2f2' : '#ffffff',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                      {modalNoteError && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.3rem' }}>
                          ⚠️ {modalNoteError}
                        </div>
                      )}

                      {/* Quick note presets */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                        {[
                          'Đã xác nhận thông tin & địa chỉ giao hàng',
                          'Đã đóng gói niêm phong tại kho',
                          'Đã bàn giao Viettel Post - MVĐ: VTP882910',
                          'Khách hàng yêu cầu hủy đơn hàng'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setModalTransitionNote(preset);
                              if (modalNoteError) setModalNoteError('');
                            }}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#f8fafc',
                              color: '#475569',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(ORDER_TRANSITIONS[selectedOrder.status] || []).map((act) => {
                        const isDanger = act.variant === 'danger';
                        const isSuccess = act.variant === 'success';
                        const bgColor = isDanger ? '#fef2f2' : isSuccess ? '#dcfce7' : '#eff6ff';
                        const textColor = isDanger ? '#dc2626' : isSuccess ? '#15803d' : '#1d4ed8';
                        const borderColor = isDanger ? '#fecaca' : isSuccess ? '#bbf7d0' : '#bfdbfe';

                        return (
                          <button
                            key={act.target}
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleModalStatusUpdate(act.target, act.label)}
                            style={{
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              border: `1px solid ${borderColor}`,
                              backgroundColor: bgColor,
                              color: textColor,
                              fontSize: '0.825rem',
                              fontWeight: 700,
                              cursor: actionLoading ? 'not-allowed' : 'pointer',
                              opacity: actionLoading ? 0.65 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {actionLoading ? 'Đang xử lý...' : act.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Dòng thời gian tiến trình trạng thái đơn hàng (ECOM-311 / ECOM-315) */}
              <OrderTimeline
                orderId={selectedOrder.id}
                currentStatus={selectedOrder.status}
                historyData={selectedOrder.statusHistories}
                compact={true}
              />
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: '#f8fafc'
              }}
            >
              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.F. MODAL XÁC NHẬN CHUYỂN TRẠNG THÁI & NHẬP GHI CHÚ TỪ BẢNG ĐƠN HÀNG */}
      {transitionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
          }}
          onClick={() => !actionLoading && setTransitionModal(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.35rem 1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              {transitionModal.targetStatus === ORDER_STATUS.CANCELLED
                ? `Xác nhận hủy đơn hàng #${transitionModal.orderId}`
                : `Cập nhật trạng thái đơn hàng #${transitionModal.orderId}`}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              Chuyển trạng thái đơn hàng <strong>#{transitionModal.orderId}</strong> sang{' '}
              <strong>"{transitionModal.actionLabel}"</strong>.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.35rem'
                }}
              >
                {transitionModal.targetStatus === ORDER_STATUS.CANCELLED ? (
                  <>
                    Lý do hủy đơn hàng <span style={{ color: '#dc2626' }}>*</span>
                  </>
                ) : transitionModal.targetStatus === ORDER_STATUS.SHIPPING ? (
                  'Mã vận đơn / Ghi chú bàn giao vận chuyển'
                ) : (
                  'Ghi chú cập nhật trạng thái (tùy chọn)'
                )}
              </label>
              <textarea
                rows={3}
                value={transitionNote}
                onChange={(e) => {
                  setTransitionNote(e.target.value);
                  if (transitionNoteError) setTransitionNoteError('');
                }}
                placeholder={
                  transitionModal.targetStatus === ORDER_STATUS.CANCELLED
                    ? 'Nhập lý do hủy đơn (VD: Khách hàng yêu cầu hủy, Không liên hệ được người nhận...)'
                    : transitionModal.targetStatus === ORDER_STATUS.SHIPPING
                      ? 'Nhập mã vận đơn & đơn vị giao hàng (VD: Viettel Post - MVĐ: VTP882910)...'
                      : 'Nhập ghi chú xử lý cho bước chuyển trạng thái này...'
                }
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: transitionNoteError ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: transitionNoteError ? '#fef2f2' : '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
              {transitionNoteError && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.3rem' }}>
                  ⚠️ {transitionNoteError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setTransitionModal(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmTableTransition}
                style={{
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor:
                    transitionModal.targetStatus === ORDER_STATUS.CANCELLED ? '#dc2626' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
                {actionLoading ? 'Đang cập nhật...' : transitionModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
