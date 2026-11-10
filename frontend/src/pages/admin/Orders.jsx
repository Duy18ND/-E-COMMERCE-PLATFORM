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
    { target: ORDER_STATUS.CONFIRMED, label: '✓ Duyệt / Xác nhận đơn', variant: 'primary' },
    { target: ORDER_STATUS.PAID, label: '💳 Xác nhận đã thu tiền', variant: 'primary', onlineOnly: true },
    { target: ORDER_STATUS.CANCELLED, label: '✕ Hủy đơn hàng', variant: 'danger' }
  ],
  [ORDER_STATUS.PAID]: [
    { target: ORDER_STATUS.CONFIRMED, label: '✓ Duyệt / Xác nhận đơn', variant: 'primary' },
    { target: ORDER_STATUS.PROCESSING, label: '📦 Chuẩn bị hàng ngay', variant: 'primary' },
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination state (UI: 1-based, Backend Spring Data: 0-based)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Order Detail Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Form cập nhật trạng thái đơn trong Modal (ECOM-292 / ECOM-293)
  const [modalTargetStatus, setModalTargetStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusFormError, setStatusFormError] = useState('');

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

  // Bộ lọc tìm kiếm & khoảng ngày đặt hàng Client-side bổ trợ (Mã đơn, Tên khách hàng, SĐT, Khoảng ngày)
  const displayedOrders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const cleanIdTerm = term.replace(/^#/, '');
    const cleanPhoneTerm = term.replace(/\s+/g, '');

    let startTs = null;
    if (startDate) {
      const parsedStart = new Date(`${startDate}T00:00:00`).getTime();
      if (!Number.isNaN(parsedStart)) startTs = parsedStart;
    }

    let endTs = null;
    if (endDate) {
      const parsedEnd = new Date(`${endDate}T23:59:59.999`).getTime();
      if (!Number.isNaN(parsedEnd)) endTs = parsedEnd;
    }

    return orders.filter((order) => {
      // Lọc theo khoảng ngày đặt hàng nếu có chọn startDate / endDate
      if (startTs !== null || endTs !== null) {
        const orderTs = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
        if (Number.isNaN(orderTs)) return false;
        if (startTs !== null && orderTs < startTs) return false;
        if (endTs !== null && orderTs > endTs) return false;
      }

      if (!term) return true;

      const orderId = String(order.id || '').toLowerCase();
      const customerName = `${order.receiverName || ''} ${order.userEmail || ''} ${order.customerName || ''}`.toLowerCase();
      const phone = String(order.receiverPhone || order.customerPhone || '').replace(/\s+/g, '');

      const matchesId =
        orderId.includes(term) ||
        (cleanIdTerm && orderId.includes(cleanIdTerm)) ||
        `#${orderId}` === term;

      return (
        matchesId ||
        customerName.includes(term) ||
        (cleanPhoneTerm && phone.includes(cleanPhoneTerm))
      );
    });
  }, [orders, searchTerm, startDate, endDate]);

  // Handler khi thay đổi bộ lọc trạng thái -> Đặt lại về trang 1
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  // Handler khi thay đổi tìm kiếm -> Reset về trang 1
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handler khi thay đổi khoảng ngày đặt hàng -> Reset về trang 1
  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setStartDate(val);
    if (val && endDate && val > endDate) {
      setEndDate(val);
    }
    setCurrentPage(1);
  };

  const handleEndDateChange = (e) => {
    const val = e.target.value;
    setEndDate(val);
    if (val && startDate && val < startDate) {
      setStartDate(val);
    }
    setCurrentPage(1);
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
    setStartDate('');
    setEndDate('');
    setSortBy('id');
    setSortDir('desc');
    setCurrentPage(1);
  };

  // Mở modal xem chi tiết đơn hàng
  const handleViewDetail = async (orderSummary) => {
    setSelectedOrder(orderSummary);
    setDetailLoading(true);
    setDetailError('');

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
  const handleCloseDetail = useCallback(() => {
    if (actionLoading) return;
    setSelectedOrder(null);
    setDetailError('');
    setStatusNote('');
    setStatusFormError('');
  }, [actionLoading]);

  // Đồng bộ trạng thái mặc định cho Form cập nhật trạng thái khi mở modal hoặc đổi trạng thái đơn
  useEffect(() => {
    if (selectedOrder) {
      const allowed = ORDER_TRANSITIONS[selectedOrder.status] || [];
      setModalTargetStatus(allowed.length > 0 ? allowed[0].target : '');
      setStatusNote('');
      setStatusFormError('');
    }
  }, [selectedOrder?.id, selectedOrder?.status]);

  // Hỗ trợ đóng modal chi tiết bằng phím Escape
  useEffect(() => {
    if (!selectedOrder) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !actionLoading) {
        handleCloseDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrder, actionLoading, handleCloseDetail]);

  // Cập nhật trạng thái gọi API Backend PUT /api/v1/admin/orders/{orderId}/status
  const handleTransitionStatus = async (orderId, targetStatus, actionLabel, customNote = '') => {
    const isDanger = targetStatus === ORDER_STATUS.CANCELLED;
    const noteSuffix = customNote ? ` (Ghi chú: "${customNote}")` : '';
    const confirmed = await confirmDialog({
      title: isDanger ? 'Xác nhận hủy đơn hàng' : 'Cập nhật trạng thái đơn hàng',
      message: `Bạn có chắc chắn muốn chuyển trạng thái đơn hàng #${orderId} sang "${actionLabel}"${noteSuffix}?`,
      variant: isDanger ? 'danger' : 'primary',
      confirmText: actionLabel,
      cancelText: 'Quay lại'
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const updatedOrder = await orderService.updateOrderStatus(orderId, targetStatus, customNote);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updatedOrder, status: targetStatus } : o))
      );
      // Nếu đang mở modal của đơn hàng này thì cập nhật luôn cả lịch sử timeline
      if (selectedOrder && selectedOrder.id === orderId) {
        let refreshedHistories = updatedOrder?.statusHistories;
        if (!refreshedHistories) {
          try {
            refreshedHistories = await orderService.getOrderStatusHistory(orderId);
          } catch {
            refreshedHistories = selectedOrder.statusHistories;
          }
        }
        setSelectedOrder((prev) => ({
          ...prev,
          ...updatedOrder,
          status: targetStatus,
          statusHistories: refreshedHistories || prev.statusHistories
        }));
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

  // Xử lý submit Form cập nhật trạng thái đơn trong Modal chi tiết (ECOM-292 / ECOM-293)
  const handleModalStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder || actionLoading) return;

    const allowed = ORDER_TRANSITIONS[selectedOrder.status] || [];
    const matchedTransition = allowed.find((t) => t.target === modalTargetStatus);
    if (!matchedTransition) {
      setStatusFormError('Trạng thái chuyển tiếp không hợp lệ theo quy trình đơn hàng.');
      return;
    }

    if (modalTargetStatus === ORDER_STATUS.CANCELLED && !statusNote.trim()) {
      setStatusFormError('Vui lòng nhập lý do hủy đơn hàng (bắt buộc khi hủy đơn).');
      notify.warning('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setStatusFormError('');
    await handleTransitionStatus(
      selectedOrder.id,
      modalTargetStatus,
      matchedTransition.label,
      statusNote.trim()
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

        {/* Bộ lọc theo khoảng ngày đặt hàng */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            paddingTop: '0.25rem'
          }}
        >
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#475569' }}>
            📅 Lọc theo ngày đặt hàng:
          </span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="order-filter-start-date" style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Từ ngày:
            </label>
            <input
              id="order-filter-start-date"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={handleStartDateChange}
              style={{
                padding: '0.42rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="order-filter-end-date" style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Đến ngày:
            </label>
            <input
              id="order-filter-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={handleEndDateChange}
              style={{
                padding: '0.42rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            />
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              ✕ Xóa lọc ngày
            </button>
          )}
        </div>

        {/* Thống kê kết quả & Nút đặt lại bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ color: '#64748b' }}>
            Hiển thị <strong>{displayedOrders.length}</strong> / tổng số <strong>{totalElements}</strong> đơn hàng
            {statusFilter && (
              <span> (Trạng thái: <strong>{ORDER_STATUS_LABELS[statusFilter] || statusFilter}</strong>)</span>
            )}
            {(startDate || endDate) && (
              <span> (Ngày đặt: <strong>{startDate || '...'} → {endDate || '...'}</strong>)</span>
            )}
          </span>
          {(searchTerm || statusFilter || startDate || endDate || sortBy !== 'id') && (
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
                : 'Thử thay đổi từ khóa tìm kiếm, khoảng ngày đặt hoặc đặt lại bộ lọc.'}
            </p>
            {(searchTerm || statusFilter || startDate || endDate) && (
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
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <OrderStatus status={order.status} />
                            {order.status === ORDER_STATUS.PAID && (
                              <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                                ⏳ Chờ Shop duyệt đơn
                              </span>
                            )}
                            {order.status === ORDER_STATUS.PENDING && (
                              <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>
                                {order.paymentMethod === 'MOCK_ONLINE' ? '⏳ Chờ khách TT / Duyệt' : '⏳ Chờ Shop duyệt đơn'}
                              </span>
                            )}
                            {order.status === ORDER_STATUS.CONFIRMED && (
                              <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 600 }}>
                                ✓ Shop đã duyệt
                              </span>
                            )}
                          </div>
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
                            {allowedTransitions
                              .filter((trans) => !trans.onlineOnly || order.paymentMethod === 'MOCK_ONLINE')
                              .map((trans) => (
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

              {/* FORM CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (ECOM-292 / ECOM-293) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '1.1rem'
                }}
              >
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  ⚙️ Cập nhật trạng thái đơn hàng
                </h4>
                {(ORDER_TRANSITIONS[selectedOrder.status] || []).length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                    Đơn hàng đang ở trạng thái cuối (<strong>{ORDER_STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</strong>), không thể chuyển sang trạng thái khác.
                  </div>
                ) : (
                  <form onSubmit={handleModalStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label
                          htmlFor="modal-order-status-select"
                          style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}
                        >
                          Chuyển sang trạng thái tiếp theo <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <select
                          id="modal-order-status-select"
                          value={modalTargetStatus}
                          disabled={actionLoading}
                          onChange={(e) => {
                            setModalTargetStatus(e.target.value);
                            setStatusFormError('');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            backgroundColor: '#ffffff',
                            outline: 'none'
                          }}
                        >
                          {(ORDER_TRANSITIONS[selectedOrder.status] || []).map((trans) => (
                            <option key={trans.target} value={trans.target}>
                              {trans.label} ({ORDER_STATUS_LABELS[trans.target] || trans.target})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="modal-order-status-note"
                          style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}
                        >
                          Ghi chú / Lý do cập nhật{' '}
                          {modalTargetStatus === ORDER_STATUS.CANCELLED ? (
                            <span style={{ color: '#dc2626' }}>* (Bắt buộc khi hủy)</span>
                          ) : (
                            <span style={{ color: '#64748b' }}>(Tùy chọn)</span>
                          )}
                        </label>
                        <input
                          id="modal-order-status-note"
                          type="text"
                          value={statusNote}
                          disabled={actionLoading}
                          onChange={(e) => {
                            setStatusNote(e.target.value);
                            if (statusFormError) setStatusFormError('');
                          }}
                          placeholder={
                            modalTargetStatus === ORDER_STATUS.CANCELLED
                              ? 'Nhập lý do hủy đơn hàng...'
                              : 'Nhập ghi chú xử lý đơn (nếu có)...'
                          }
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '6px',
                            border: statusFormError ? '1px solid #ef4444' : '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            backgroundColor: '#ffffff',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    {statusFormError && (
                      <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                        ⚠️ {statusFormError}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={actionLoading || !modalTargetStatus}
                        style={{
                          padding: '0.5rem 1.15rem',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: modalTargetStatus === ORDER_STATUS.CANCELLED ? '#dc2626' : '#2563eb',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: actionLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {actionLoading ? '⏳ Đang cập nhật...' : '💾 Lưu trạng thái mới'}
                      </button>
                    </div>
                  </form>
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
    </div>
  );
};

export default AdminOrders;
