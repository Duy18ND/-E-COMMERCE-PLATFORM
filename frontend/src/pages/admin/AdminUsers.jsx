import { useState, useEffect, useMemo, useCallback } from 'react';
import userService, { formatCustomerAddress } from '../../services/userService';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatCurrency';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import OrderStatus from '../../components/order/OrderStatus';
import Pagination from '../../components/admin/Pagination';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

const fmtDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const fmtDateTime = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleString('vi-VN');
};

/** Badge hiển thị trạng thái ACTIVE / LOCKED */
const UserStatusBadge = ({ status }) => {
  const isLocked = status === 'LOCKED' || status === 'BLOCKED';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        backgroundColor: isLocked ? '#fee2e2' : '#dcfce7',
        color: isLocked ? '#dc2626' : '#166534',
        border: `1px solid ${isLocked ? '#fecaca' : '#bbf7d0'}`,
        fontSize: '0.75rem',
        fontWeight: 700,
        whiteSpace: 'nowrap'
      }}
    >
      <span>{isLocked ? '🔒' : '●'}</span>
      <span>{isLocked ? 'Đã khóa' : 'Đang hoạt động'}</span>
    </span>
  );
};

/** Badge hiển thị vai trò USER / ADMIN */
const UserRoleBadge = ({ role }) => {
  const isAdmin = role === 'ADMIN';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.22rem 0.6rem',
        borderRadius: '6px',
        backgroundColor: isAdmin ? '#ede9fe' : '#eff6ff',
        color: isAdmin ? '#6d28d9' : '#1d4ed8',
        border: `1px solid ${isAdmin ? '#ddd6fe' : '#bfdbfe'}`,
        fontSize: '0.75rem',
        fontWeight: 800,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap'
      }}
    >
      <span>{isAdmin ? '🛡️' : '👤'}</span>
      <span>{isAdmin ? 'ADMIN' : 'KHÁCH HÀNG'}</span>
    </span>
  );
};

const AdminUsers = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Tìm kiếm, Bộ lọc & Sắp xếp
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('newest');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal Chi tiết khách hàng
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Confirm Dialog Khóa / Mở khóa tài khoản
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    targetUser: null,
    nextStatus: 'LOCKED'
  });

  // Tải danh sách khách hàng từ API Backend (GET /api/v1/admin/customers)
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userService.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải danh sách khách hàng từ máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Thống kê tổng quan khách hàng & tài khoản
  const stats = useMemo(() => {
    const customers = users.filter((u) => u.role !== 'ADMIN');
    const totalCustomers = customers.length;
    const totalAll = users.length;
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const locked = users.filter((u) => u.status === 'LOCKED' || u.status === 'BLOCKED').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    return { totalCustomers, totalAll, active, locked, admins };
  }, [users]);

  // Tìm kiếm theo ID, Họ tên, Email, Số điện thoại + Lọc Vai trò, Trạng thái + Sắp xếp
  const filteredUsers = useMemo(() => {
    const rawKeyword = searchTerm.trim().toLowerCase();
    const cleanIdKeyword = rawKeyword.replace(/^#/, '');
    const cleanPhoneKeyword = rawKeyword.replace(/\s+/g, '');

    const filtered = users.filter((item) => {
      const idStr = String(item.id ?? '').toLowerCase();
      const fullName = (item.name || item.fullName || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const phone = (item.phone && item.phone !== 'Chưa cập nhật' ? item.phone : '')
        .replace(/\s+/g, '')
        .toLowerCase();

      const matchSearch =
        !rawKeyword ||
        idStr.includes(cleanIdKeyword) ||
        `#${idStr}`.includes(rawKeyword) ||
        fullName.includes(rawKeyword) ||
        email.includes(rawKeyword) ||
        (cleanPhoneKeyword && phone.includes(cleanPhoneKeyword));

      const matchRole = roleFilter === 'ALL' || item.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === 'id_asc') {
        return Number(a.id || 0) - Number(b.id || 0);
      }
      if (sortOption === 'id_desc') {
        return Number(b.id || 0) - Number(a.id || 0);
      }
      if (sortOption === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '', 'vi');
      }
      if (sortOption === 'oldest') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tA - tB || Number(a.id || 0) - Number(b.id || 0);
      }
      // Mặc định: newest
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA || Number(b.id || 0) - Number(a.id || 0);
    });
  }, [users, searchTerm, roleFilter, statusFilter, sortOption]);

  // Dữ liệu phân trang
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortOption('newest');
    setCurrentPage(1);
  };

  // Xem chi tiết khách hàng từ API thật:
  // GET /api/v1/admin/customers/{id} & GET /api/v1/admin/orders/customer/{userId}
  const handleOpenDetail = async (targetUser) => {
    if (!targetUser) return;
    setIsDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailUser({
      ...targetUser,
      orders: [],
      orderCount: 0,
      completedOrderCount: 0,
      cancelledOrderCount: 0,
      totalSpent: 0
    });

    try {
      const fullDetail = await userService.getUserById(targetUser.id);
      setDetailUser(fullDetail);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải thông tin chi tiết khách hàng từ máy chủ.';
      setDetailError(msg);
      showToast({
        type: 'error',
        title: 'Lỗi tải chi tiết khách hàng',
        message: msg
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // Mở Confirm Dialog trước khi Khóa / Mở khóa tài khoản
  const handleRequestToggleStatus = (targetUser) => {
    if (!targetUser) return;

    const currentAdminEmail = (currentAdmin?.email || '').trim().toLowerCase();
    const isSelf =
      currentAdminEmail &&
      (targetUser.email || '').toLowerCase() === currentAdminEmail;

    if (isSelf || targetUser.role === 'ADMIN') {
      showToast({
        type: 'warning',
        title: 'Thao tác bị từ chối',
        message: 'Không được phép khóa tài khoản Quản trị viên (ADMIN).'
      });
      return;
    }

    const nextStatus = targetUser.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    setConfirmState({
      isOpen: true,
      targetUser,
      nextStatus
    });
  };

  // Xác nhận Khóa / Mở khóa qua PUT /api/v1/admin/customers/{id}/status
  const handleConfirmStatusChange = async () => {
    const { targetUser, nextStatus } = confirmState;
    if (!targetUser) return;

    setActionLoading(true);
    try {
      const updated =
        nextStatus === 'LOCKED'
          ? await userService.lockUser(targetUser.id)
          : await userService.unlockUser(targetUser.id);

      setUsers((prev) =>
        prev.map((u) => (String(u.id) === String(targetUser.id) ? { ...u, ...updated } : u))
      );

      if (detailUser && String(detailUser.id) === String(targetUser.id)) {
        setDetailUser((prev) => (prev ? { ...prev, status: updated.status } : null));
      }

      setConfirmState({ isOpen: false, targetUser: null, nextStatus: 'LOCKED' });

      showToast({
        type: 'success',
        title: nextStatus === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
        message:
          nextStatus === 'LOCKED'
            ? `Khách hàng "${targetUser.name}" (#${targetUser.id}) đã chuyển sang trạng thái Đã khóa.`
            : `Khách hàng "${targetUser.name}" (#${targetUser.id}) đã chuyển lại trạng thái Đang hoạt động.`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Không thể cập nhật trạng thái',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'Đã xảy ra lỗi khi cập nhật trạng thái tài khoản.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const currentAdminEmail = (currentAdmin?.email || '').trim().toLowerCase();
  const hasActiveFilter =
    Boolean(searchTerm.trim()) ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    sortOption !== 'newest';

  return (
    <div className="admin-users-page">
      {/* 1. PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}
          >
            Quản lý Khách hàng & Tài khoản
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Tra cứu thông tin khách hàng, lịch sử mua hàng, địa chỉ nhận hàng và kiểm soát trạng thái tài khoản
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={loading || actionLoading}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.55rem 1rem',
            cursor: loading || actionLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#2563eb',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🔄</span>
          <span>{loading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorMessage message={error} onClose={() => setError('')} />
        </div>
      )}

      {/* 2. THỐNG KÊ TỔNG QUAN KHÁCH HÀNG */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        {[
          {
            label: 'Tổng khách hàng',
            value: stats.totalCustomers,
            sub: `Tổng tài khoản hệ thống: ${stats.totalAll}`,
            color: '#2563eb',
            bg: '#eff6ff',
            icon: '👥'
          },
          {
            label: 'Đang hoạt động',
            value: stats.active,
            sub: 'Tài khoản trạng thái ACTIVE',
            color: '#16a34a',
            bg: '#dcfce7',
            icon: '✅'
          },
          {
            label: 'Đã khóa',
            value: stats.locked,
            sub: 'Tài khoản bị khóa tạm thời',
            color: '#dc2626',
            bg: '#fef2f2',
            icon: '🔒'
          },
          {
            label: 'Tổng Quản trị viên',
            value: stats.admins,
            sub: 'Tài khoản quyền ADMIN',
            color: '#7c3aed',
            bg: '#ede9fe',
            icon: '🛡️'
          }
        ].map((item) => (
          <div
            key={item.label}
            className="card"
            style={{
              padding: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              minWidth: 0
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: item.bg,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0
              }}
            >
              {item.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {item.label}
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: item.color,
                  lineHeight: 1.2
                }}
              >
                {item.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                {item.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. THANH TÌM KIẾM, BỘ LỌC & SẮP XẾP */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          borderRadius: '14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '0.75rem',
          alignItems: 'center'
        }}
      >
        {/* Tìm kiếm theo ID, Họ tên, Email, Số điện thoại */}
        <div style={{ position: 'relative', minWidth: 0, gridColumn: 'span 2' }}>
          <span
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo ID (#1), họ tên, email hoặc số điện thoại..."
            aria-label="Tìm kiếm khách hàng theo ID, họ tên, email hoặc số điện thoại"
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {/* Bộ lọc Vai trò: Tất cả / USER / ADMIN */}
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Lọc theo vai trò"
          style={{
            width: '100%',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            outline: 'none',
            backgroundColor: '#ffffff'
          }}
        >
          <option value="ALL">Vai trò: Tất cả</option>
          <option value="USER">👤 Khách hàng (USER)</option>
          <option value="ADMIN">🛡️ Quản trị viên (ADMIN)</option>
        </select>

        {/* Bộ lọc Trạng thái: Tất cả / Đang hoạt động / Đã khóa */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Lọc theo trạng thái"
          style={{
            width: '100%',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            outline: 'none',
            backgroundColor: '#ffffff'
          }}
        >
          <option value="ALL">Trạng thái: Tất cả</option>
          <option value="ACTIVE">🟢 Đang hoạt động (ACTIVE)</option>
          <option value="LOCKED">🔒 Đã khóa (LOCKED)</option>
        </select>

        {/* Sắp xếp */}
        <select
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Sắp xếp danh sách"
          style={{
            width: '100%',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            outline: 'none',
            backgroundColor: '#ffffff'
          }}
        >
          <option value="newest">Sắp xếp: Mới đăng ký</option>
          <option value="oldest">Sắp xếp: Đăng ký cũ nhất</option>
          <option value="id_desc">Sắp xếp: ID giảm dần</option>
          <option value="id_asc">Sắp xếp: ID tăng dần</option>
          <option value="name_asc">Sắp xếp: Họ tên A → Z</option>
        </select>

        {/* Tổng kết quả & nút Đặt lại */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem',
            fontSize: '0.82rem',
            color: '#64748b',
            whiteSpace: 'nowrap'
          }}
        >
          <span>
            Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} tài khoản
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* 4. DANH SÁCH KHÁCH HÀNG DẠNG TABLE */}
      <div className="card" style={{ padding: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem' }}>
            <Loading message="Đang tải danh sách khách hàng từ hệ thống..." />
          </div>
        ) : error && users.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontWeight: 700 }}>
              Không thể tải danh sách khách hàng
            </h3>
            <p style={{ fontSize: '0.875rem', margin: '0 0 1rem', color: '#dc2626' }}>
              {error}
            </p>
            <Button variant="primary" size="sm" onClick={loadUsers}>
              🔄 Thử lại ngay
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>👥</div>
            <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontWeight: 700 }}>
              Không tìm thấy khách hàng phù hợp
            </h3>
            <p style={{ fontSize: '0.875rem', margin: '0 0 1rem' }}>
              Hãy thử tìm kiếm bằng ID, họ tên, email, số điện thoại khác hoặc đặt lại bộ lọc.
            </p>
            {hasActiveFilter && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrapper table-responsive" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '980px', width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: '90px', textAlign: 'center' }}>ID KH</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Ngày đăng ký</th>
                    <th>Trạng thái tài khoản</th>
                    <th style={{ minWidth: '220px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const isSelf =
                      currentAdminEmail && (u.email || '').toLowerCase() === currentAdminEmail;
                    const isAdminRole = u.role === 'ADMIN';
                    const isLocked = u.status === 'LOCKED' || u.status === 'BLOCKED';
                    const hasPhone = u.phone && u.phone !== 'Chưa cập nhật';

                    return (
                      <tr
                        key={u.id}
                        style={{
                          backgroundColor: isLocked ? '#fffafa' : undefined
                        }}
                      >
                        {/* ID khách hàng */}
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 800,
                            color: '#1e293b',
                            fontSize: '0.85rem'
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            #{u.id}
                          </span>
                        </td>

                        {/* Họ tên + Avatar + Vai trò */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img
                              src={u.avatar || FALLBACK_AVATAR}
                              alt={u.name}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = FALLBACK_AVATAR;
                              }}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isAdminRole ? '2px solid #7c3aed' : '2px solid #e2e8f0',
                                flexShrink: 0
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  {u.name}
                                </span>
                                {isSelf && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      backgroundColor: '#dbeafe',
                                      color: '#1e40af',
                                      padding: '1px 6px',
                                      borderRadius: '9999px'
                                    }}
                                  >
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div style={{ marginTop: '3px' }}>
                                <UserRoleBadge role={u.role} />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ color: '#334155', fontWeight: 500, fontSize: '0.875rem' }}>
                          {u.email || '—'}
                        </td>

                        {/* Số điện thoại */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                          {hasPhone ? (
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              📞 {u.phone}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.82rem' }}>
                              Chưa cập nhật
                            </span>
                          )}
                        </td>

                        {/* Ngày đăng ký */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#475569' }}>
                          <div>{fmtDate(u.createdAt)}</div>
                        </td>

                        {/* Trạng thái tài khoản */}
                        <td>
                          <UserStatusBadge status={u.status} />
                        </td>

                        {/* Thao tác */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(u)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              👁️ Xem chi tiết
                            </button>

                            {isAdminRole ? (
                              <span
                                title={
                                  isSelf
                                    ? 'Không thể tự khóa tài khoản Admin đang đăng nhập'
                                    : 'Tài khoản Quản trị viên được bảo vệ'
                                }
                                style={{
                                  fontSize: '0.74rem',
                                  color: '#64748b',
                                  backgroundColor: '#f1f5f9',
                                  padding: '0.3rem 0.55rem',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🛡️ Bảo vệ Admin
                              </span>
                            ) : isLocked ? (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleRequestToggleStatus(u)}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '6px',
                                  border: '1px solid #86efac',
                                  backgroundColor: '#dcfce7',
                                  color: '#166534',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🔓 Mở khóa
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleRequestToggleStatus(u)}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                🔒 Khóa tài khoản
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20, 50]}
              unitName="khách hàng"
            />
          </>
        )}
      </div>

      {/* 5. CONFIRM DIALOG KHÓA / MỞ KHÓA TÀI KHOẢN */}
      {confirmState.targetUser && (
        <Modal
          isOpen={confirmState.isOpen}
          onClose={() =>
            !actionLoading &&
            setConfirmState({ isOpen: false, targetUser: null, nextStatus: 'LOCKED' })
          }
          title={
            confirmState.nextStatus === 'LOCKED'
              ? 'Xác nhận khóa tài khoản khách hàng'
              : 'Xác nhận mở khóa tài khoản khách hàng'
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.9rem 1rem',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <img
                src={confirmState.targetUser.avatar || FALLBACK_AVATAR}
                alt={confirmState.targetUser.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_AVATAR;
                }}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                  {confirmState.targetUser.name} (#{confirmState.targetUser.id})
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {confirmState.targetUser.email}
                </div>
              </div>
            </div>

            {confirmState.nextStatus === 'LOCKED' ? (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.875rem',
                  color: '#991b1b',
                  lineHeight: 1.55
                }}
              >
                ⚠️ Bạn có chắc chắn muốn <strong>Khóa tài khoản</strong> này không?
                <br />
                Sau khi khóa, trạng thái tài khoản trên hệ thống sẽ chuyển sang{' '}
                <strong>Đã khóa (BLOCKED)</strong>. Dữ liệu hồ sơ và lịch sử đơn hàng vẫn được bảo toàn.
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.875rem',
                  color: '#166534',
                  lineHeight: 1.55
                }}
              >
                ✅ Bạn có chắc chắn muốn <strong>Mở khóa tài khoản</strong> này không?
                <br />
                Sau khi mở khóa, trạng thái tài khoản sẽ trở lại{' '}
                <strong>Đang hoạt động (ACTIVE)</strong> để khách hàng tiếp tục mua sắm.
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <Button
                variant="secondary"
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  setConfirmState({ isOpen: false, targetUser: null, nextStatus: 'LOCKED' })
                }
              >
                Hủy bỏ
              </Button>
              <Button
                variant={confirmState.nextStatus === 'LOCKED' ? 'danger' : 'primary'}
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmStatusChange}
              >
                {actionLoading
                  ? 'Đang xử lý...'
                  : confirmState.nextStatus === 'LOCKED'
                    ? '🔒 Xác nhận khóa'
                    : '🔓 Xác nhận mở khóa'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. MODAL CHI TIẾT KHÁCH HÀNG (Lấy từ GET /api/v1/admin/customers/{id} & GET /api/v1/admin/orders/customer/{userId}) */}
      {detailUser && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Hồ sơ chi tiết khách hàng #${detailUser.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {detailError && (
              <ErrorMessage message={detailError} onClose={() => setDetailError('')} />
            )}

            {/* Header thông tin cá nhân */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.1rem',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                flexWrap: 'wrap'
              }}
            >
              <img
                src={detailUser.avatar || FALLBACK_AVATAR}
                alt={detailUser.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_AVATAR;
                }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #2563eb',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.3rem'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {detailUser.name}
                  </h3>
                  <UserRoleBadge role={detailUser.role} />
                  <UserStatusBadge status={detailUser.status} />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>{detailUser.email}</div>
              </div>
            </div>

            {/* Lưới thông tin chi tiết */}
            <div className="form-grid-2" style={{ gap: '0.75rem' }}>
              {[
                { label: 'ID khách hàng', value: `#${detailUser.id}` },
                { label: 'Số điện thoại', value: detailUser.phone || 'Chưa cập nhật' },
                {
                  label: 'Vai trò hệ thống',
                  value: detailUser.role === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Khách hàng (USER)'
                },
                {
                  label: 'Trạng thái tài khoản',
                  value:
                    detailUser.status === 'LOCKED'
                      ? 'Đã khóa (LOCKED)'
                      : 'Đang hoạt động (ACTIVE)'
                },
                { label: 'Ngày đăng ký', value: fmtDateTime(detailUser.createdAt) },
                {
                  label: 'Tổng đơn hàng đã đặt',
                  value: detailLoading ? 'Đang tải...' : `${detailUser.orderCount ?? 0} đơn hàng`
                }
              ].map((info) => (
                <div
                  key={info.label}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    padding: '0.75rem 0.85rem',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{info.label}</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      marginTop: '0.2rem'
                    }}
                  >
                    {info.value}
                  </div>
                </div>
              ))}

              {/* Địa chỉ thực tế từ Backend */}
              <div
                className="col-span-full"
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  padding: '0.8rem 0.9rem',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                  📍 Địa chỉ nhận hàng thực tế
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    marginTop: '0.25rem'
                  }}
                >
                  {detailLoading ? 'Đang tải địa chỉ...' : detailUser.address || 'Chưa cập nhật'}
                </div>
                {detailUser.defaultAddress?.receiverName && (
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.2rem' }}>
                    Người nhận: <strong>{detailUser.defaultAddress.receiverName}</strong>
                    {detailUser.defaultAddress.phone ? ` • 📞 ${detailUser.defaultAddress.phone}` : ''}
                  </div>
                )}

                {Array.isArray(detailUser.addresses) && detailUser.addresses.length > 1 && (
                  <div
                    style={{
                      marginTop: '0.55rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed #cbd5e1',
                      fontSize: '0.78rem',
                      color: '#475569'
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                      Sổ địa chỉ đã lưu ({detailUser.addresses.length}):
                    </div>
                    {detailUser.addresses.map((addr, i) => (
                      <div key={addr.id || i} style={{ marginBottom: '0.2rem' }}>
                        • {formatCustomerAddress(addr)}
                        {addr.isDefault ? ' (Mặc định)' : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Thống kê & Lịch sử mua hàng thực tế */}
            <div
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.9rem'
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
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    📦 Lịch sử mua hàng ({detailUser.orderCount ?? 0} đơn)
                  </div>
                  {!detailLoading && (detailUser.orderCount ?? 0) > 0 && (
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                      Hoàn thành: <strong style={{ color: '#16a34a' }}>{detailUser.completedOrderCount ?? 0}</strong> • Đã hủy:{' '}
                      <strong style={{ color: '#dc2626' }}>{detailUser.cancelledOrderCount ?? 0}</strong>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#475569',
                    backgroundColor: '#eff6ff',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe'
                  }}
                >
                  Tổng chi tiêu thực tế:{' '}
                  <strong style={{ color: '#2563eb', fontSize: '0.95rem' }}>
                    {formatCurrency(detailUser.totalSpent ?? 0)}
                  </strong>
                </div>
              </div>

              {detailLoading ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '0.75rem 0', textAlign: 'center' }}>
                  Đang tải lịch sử mua hàng từ máy chủ...
                </div>
              ) : Array.isArray(detailUser.orders) && detailUser.orders.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    paddingRight: '2px'
                  }}
                >
                  {detailUser.orders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#0f172a' }}>Đơn #{ord.id}</strong>
                          <span style={{ color: '#64748b' }}>{fmtDateTime(ord.createdAt)}</span>
                          <OrderStatus status={ord.status} />
                        </div>
                        {ord.shippingAddress && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            📍 {ord.shippingAddress}
                          </div>
                        )}
                      </div>
                      <strong style={{ color: '#dc2626', fontSize: '0.88rem' }}>
                        {formatCurrency(ord.finalAmount ?? ord.totalAmount ?? 0)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: '0.84rem',
                    textAlign: 'center'
                  }}
                >
                  Khách hàng này chưa phát sinh đơn hàng nào trên hệ thống.
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div>
                {detailUser.role !== 'ADMIN' && (
                  <Button
                    variant={detailUser.status === 'LOCKED' ? 'primary' : 'danger'}
                    size="sm"
                    onClick={() => handleRequestToggleStatus(detailUser)}
                  >
                    {detailUser.status === 'LOCKED' ? '🔓 Mở khóa tài khoản' : '🔒 Khóa tài khoản'}
                  </Button>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminUsers;

