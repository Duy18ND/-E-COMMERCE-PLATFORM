import { useState, useEffect, useMemo, useCallback } from 'react';
import userService from '../../services/userService';
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

/** Badge hiển thị trạng thái ACTIVE / LOCKED (Yêu cầu 14) */
const UserStatusBadge = ({ status }) => {
  const isLocked = status === 'LOCKED';
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
      <span>{isAdmin ? 'ADMIN' : 'USER'}</span>
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

  // Tìm kiếm & Bộ lọc (Yêu cầu 4, 5, 6)
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Phân trang (Yêu cầu 10)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal Chi tiết tài khoản (Yêu cầu 9)
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirm Dialog Khóa / Mở khóa tài khoản (Yêu cầu 7)
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    targetUser: null,
    nextStatus: 'LOCKED'
  });

  // Tải danh sách tài khoản từ Mock Service
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userService.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Thống kê phía trên danh sách (Yêu cầu 15)
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const locked = users.filter((u) => u.status === 'LOCKED').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    return { total, active, locked, admins };
  }, [users]);

  // Lọc danh sách theo Họ tên, Email, Vai trò, Trạng thái
  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return users.filter((item) => {
      const fullName = (item.name || item.fullName || '').toLowerCase();
      const email = (item.email || '').toLowerCase();

      const matchSearch =
        !keyword || fullName.includes(keyword) || email.includes(keyword);
      const matchRole = roleFilter === 'ALL' || item.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Dữ liệu phân trang
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // Xem chi tiết tài khoản (kèm thông tin đơn hàng Mock)
  const handleOpenDetail = async (targetUser) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    setDetailUser({ ...targetUser, orders: [], orderCount: 0, totalSpent: 0 });
    try {
      const fullDetail = await userService.getUserById(targetUser.id);
      setDetailUser(fullDetail);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi tải chi tiết',
        message: err.message || 'Không thể tải thông tin chi tiết tài khoản.'
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // Mở Confirm Dialog trước khi Khóa / Mở khóa tài khoản USER
  const handleRequestToggleStatus = (targetUser) => {
    if (!targetUser) return;

    const currentAdminEmail = (currentAdmin?.email || '').trim().toLowerCase();
    const isSelf =
      currentAdminEmail &&
      targetUser.email.toLowerCase() === currentAdminEmail;

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

  // Xác nhận Khóa / Mở khóa trong Confirm Dialog
  const handleConfirmStatusChange = async () => {
    const { targetUser, nextStatus } = confirmState;
    if (!targetUser) return;

    setActionLoading(true);
    try {
      const updated =
        nextStatus === 'LOCKED'
          ? await userService.lockUser(targetUser.id, currentAdmin?.email)
          : await userService.unlockUser(targetUser.id, currentAdmin?.email);

      // Cập nhật ngay trên state danh sách mà không xóa tài khoản
      setUsers((prev) =>
        prev.map((u) => (String(u.id) === String(updated.id) ? { ...u, ...updated } : u))
      );

      // Nếu đang mở Modal Chi tiết của chính user này thì cập nhật luôn
      if (detailUser && String(detailUser.id) === String(updated.id)) {
        setDetailUser((prev) => (prev ? { ...prev, status: updated.status } : null));
      }

      setConfirmState({ isOpen: false, targetUser: null, nextStatus: 'LOCKED' });

      showToast({
        type: 'success',
        title: nextStatus === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
        message:
          nextStatus === 'LOCKED'
            ? `Tài khoản "${updated.name}" (${updated.email}) đã chuyển sang trạng thái Đã khóa.`
            : `Tài khoản "${updated.name}" (${updated.email}) đã chuyển lại trạng thái Đang hoạt động.`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Không thể cập nhật',
        message: err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái tài khoản.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const currentAdminEmail = (currentAdmin?.email || 'admin@test.com').trim().toLowerCase();

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
            Quản lý tài khoản
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Tra cứu thông tin thành viên, phân quyền vai trò và kiểm soát trạng thái hoạt động
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
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#2563eb',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🔄</span>
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {/* 2. THỐNG KÊ PHÍA TRÊN DANH SÁCH (Yêu cầu 15) */}
      <div className="grid-cols-4" style={{ marginBottom: '1.75rem' }}>
        {[
          {
            label: 'Tổng tài khoản',
            value: stats.total,
            color: '#2563eb',
            bg: '#eff6ff',
            icon: '👥'
          },
          {
            label: 'Đang hoạt động',
            value: stats.active,
            color: '#16a34a',
            bg: '#dcfce7',
            icon: '✅'
          },
          {
            label: 'Đã khóa',
            value: stats.locked,
            color: '#dc2626',
            bg: '#fef2f2',
            icon: '🔒'
          },
          {
            label: 'Tổng Admin',
            value: stats.admins,
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
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: item.bg,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
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
            </div>
          </div>
        ))}
      </div>

      {/* 3. THANH TÌM KIẾM & BỘ LỌC (Yêu cầu 4, 5, 6) */}
      <div
        className="card admin-voucher-filter-bar"
        style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: '14px' }}
      >
        {/* Tìm kiếm theo Họ tên hoặc Email */}
        <div className="voucher-filter-search" style={{ position: 'relative', minWidth: 0 }}>
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
            placeholder="Tìm kiếm theo họ tên hoặc địa chỉ email..."
            aria-label="Tìm kiếm tài khoản theo họ tên hoặc email"
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
          className="voucher-filter-select"
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
          <option value="USER">👤 USER (Khách hàng)</option>
          <option value="ADMIN">🛡️ ADMIN (Quản trị viên)</option>
        </select>

        {/* Bộ lọc Trạng thái: Tất cả / Đang hoạt động / Đã khóa */}
        <select
          className="voucher-filter-select"
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
          <option value="ACTIVE">🟢 Đang hoạt động</option>
          <option value="LOCKED">🔒 Đã khóa</option>
        </select>

        {/* Tổng kết quả & nút Đặt lại */}
        <div
          className="voucher-filter-total"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.82rem',
            color: '#64748b',
            whiteSpace: 'nowrap'
          }}
        >
          <span>
            Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} tài khoản
          </span>
          {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
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

      {/* 4. DANH SÁCH TÀI KHOẢN DẠNG TABLE (Yêu cầu 3, 7, 8, 10) */}
      <div className="card" style={{ padding: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem' }}>
            <Loading message="Đang tải danh sách tài khoản hệ thống..." />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>👥</div>
            <h3 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontWeight: 700 }}>
              Không tìm thấy tài khoản phù hợp
            </h3>
            <p style={{ fontSize: '0.875rem', margin: '0 0 1rem' }}>
              Hãy thử tìm với từ khóa khác hoặc đặt lại bộ lọc vai trò / trạng thái.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Đặt lại bộ lọc
            </Button>
          </div>
        ) : (
          <>
            <div className="table-wrapper table-responsive">
              <table className="data-table" style={{ minWidth: '920px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: '64px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '76px' }}>Avatar</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th style={{ minWidth: '220px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u, idx) => {
                    const stt = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isSelf = u.email.toLowerCase() === currentAdminEmail;
                    const isAdminRole = u.role === 'ADMIN';
                    const isLocked = u.status === 'LOCKED';

                    return (
                      <tr
                        key={u.id}
                        style={{
                          backgroundColor: isLocked ? '#fffafa' : undefined
                        }}
                      >
                        {/* STT */}
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#64748b',
                            fontSize: '0.85rem'
                          }}
                        >
                          {stt}
                        </td>

                        {/* Avatar */}
                        <td>
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
                              display: 'block'
                            }}
                          />
                        </td>

                        {/* Họ tên */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
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
                          {u.phone && u.phone !== 'Chưa cập nhật' && (
                            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                              📞 {u.phone}
                            </div>
                          )}
                        </td>

                        {/* Email */}
                        <td style={{ color: '#334155', fontWeight: 500, fontSize: '0.875rem' }}>
                          {u.email}
                        </td>

                        {/* Vai trò */}
                        <td>
                          <UserRoleBadge role={u.role} />
                        </td>

                        {/* Trạng thái */}
                        <td>
                          <UserStatusBadge status={u.status} />
                        </td>

                        {/* Ngày tạo */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#475569' }}>
                          {fmtDate(u.createdAt)}
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
                              Xem chi tiết
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
              itemsPerPageOptions={[5, 10, 20]}
              unitName="tài khoản"
            />
          </>
        )}
      </div>

      {/* 5. CONFIRM DIALOG KHÓA / MỞ KHÓA TÀI KHOẢN (Yêu cầu 7, 12, 13) */}
      {confirmState.targetUser && (
        <Modal
          isOpen={confirmState.isOpen}
          onClose={() =>
            !actionLoading &&
            setConfirmState({ isOpen: false, targetUser: null, nextStatus: 'LOCKED' })
          }
          title={
            confirmState.nextStatus === 'LOCKED'
              ? 'Xác nhận khóa tài khoản'
              : 'Xác nhận mở khóa tài khoản'
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
                  {confirmState.targetUser.name}
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
                Sau khi khóa, trạng thái tài khoản sẽ chuyển sang <strong>Đã khóa (LOCKED)</strong>. Dữ liệu tài khoản và lịch sử đơn hàng vẫn được bảo toàn nguyên vẹn.
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
                Sau khi mở khóa, trạng thái tài khoản sẽ trở lại <strong>Đang hoạt động (ACTIVE)</strong> để người dùng tiếp tục mua sắm.
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

      {/* 6. MODAL CHI TIẾT TÀI KHOẢN (Yêu cầu 9) */}
      {detailUser && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Chi tiết tài khoản #${detailUser.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
                { label: 'Mã tài khoản', value: `#${detailUser.id}` },
                { label: 'Số điện thoại', value: detailUser.phone || 'Chưa cập nhật' },
                {
                  label: 'Vai trò hệ thống',
                  value: detailUser.role === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Khách hàng (USER)'
                },
                {
                  label: 'Trạng thái',
                  value: detailUser.status === 'LOCKED' ? 'Đã khóa (LOCKED)' : 'Đang hoạt động (ACTIVE)'
                },
                { label: 'Ngày tạo tài khoản', value: fmtDateTime(detailUser.createdAt) },
                {
                  label: 'Tổng đơn hàng đã đặt',
                  value: detailLoading ? 'Đang tính...' : `${detailUser.orderCount ?? 0} đơn hàng`
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

              <div
                className="col-span-full"
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  padding: '0.75rem 0.85rem',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Địa chỉ mặc định</div>
                <div
                  style={{
                    fontWeight: 600,
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    marginTop: '0.2rem'
                  }}
                >
                  {detailUser.address || 'Chưa cập nhật'}
                </div>
              </div>
            </div>

            {/* Thống kê & Lịch sử đơn hàng của tài khoản (nếu có) */}
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
                  marginBottom: '0.65rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  📦 Lịch sử đơn hàng ({detailUser.orderCount ?? 0} đơn)
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Tổng chi tiêu:{' '}
                  <strong style={{ color: '#2563eb' }}>
                    {formatCurrency(detailUser.totalSpent ?? 0)}
                  </strong>
                </div>
              </div>

              {detailLoading ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '0.5rem 0' }}>
                  Đang tải dữ liệu đơn hàng...
                </div>
              ) : Array.isArray(detailUser.orders) && detailUser.orders.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}
                >
                  {detailUser.orders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: '#0f172a' }}>#{ord.id}</strong>
                        <span style={{ color: '#64748b' }}>{fmtDate(ord.createdAt)}</span>
                        <OrderStatus status={ord.status} />
                      </div>
                      <strong style={{ color: '#dc2626' }}>
                        {formatCurrency(ord.totalAmount || 0)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    color: '#64748b',
                    fontSize: '0.82rem',
                    textAlign: 'center'
                  }}
                >
                  Tài khoản này chưa phát sinh đơn hàng nào trên hệ thống.
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
                {detailUser.role === 'USER' && (
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

