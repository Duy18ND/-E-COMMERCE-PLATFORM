import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import reviewService, {
  REVIEW_MODERATION_STATUS,
  VIOLATION_REASON_PRESETS,
  MAX_HIDDEN_REASON_LENGTH,
  STAR_RATING_LABELS,
  calculateAdminReviewStats,
  filterAdminReviews
} from '../../services/reviewService';
import { normalizeProduct } from '../../services/productService';
import { normalizeUser } from '../../services/userService';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Pagination from '../../components/admin/Pagination';

const DEFAULT_PRODUCT_THUMB =
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=160&q=80';

const MODERATION_STATUS_CONFIG = {
  [REVIEW_MODERATION_STATUS.PENDING]: {
    label: 'Chờ duyệt',
    icon: '⏳',
    bg: '#fef3c7',
    color: '#b45309',
    border: '#fde68a'
  },
  [REVIEW_MODERATION_STATUS.APPROVED]: {
    label: 'Đã duyệt',
    icon: '✓',
    bg: '#dcfce7',
    color: '#166534',
    border: '#bbf7d0'
  },
  [REVIEW_MODERATION_STATUS.HIDDEN]: {
    label: 'Đã ẩn',
    icon: '🙈',
    bg: '#fee2e2',
    color: '#b91c1c',
    border: '#fecaca'
  }
};

const fmtDateTime = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return String(str);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const renderStarIcons = (rating = 0, size = '0.95rem') => {
  const safe = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span
      aria-label={`${safe} sao`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', fontSize: size, lineHeight: 1 }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{ color: star <= safe ? '#f59e0b' : '#cbd5e1' }}>
          ★
        </span>
      ))}
    </span>
  );
};

const ReviewStatusBadge = ({ status }) => {
  const normalized = String(status || REVIEW_MODERATION_STATUS.APPROVED).toUpperCase();
  const cfg =
    MODERATION_STATUS_CONFIG[normalized] ||
    MODERATION_STATUS_CONFIG[REVIEW_MODERATION_STATUS.APPROVED];

  return (
    <span
      data-testid={`admin-review-status-badge-${normalized}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: '0.75rem',
        fontWeight: 700,
        whiteSpace: 'nowrap'
      }}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
};

const extractArrayPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.content)) return payload.content;
  return [];
};

const AdminReviews = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { showToast, notify } = useToast();

  // Dữ liệu đánh giá gốc từ Backend API (kèm thông tin sản phẩm & khách hàng thật)
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc & tìm kiếm
  const [productQuery, setProductQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt,desc');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal Xem chi tiết đánh giá
  const [detailReview, setDetailReview] = useState(null);

  // Modal Xác nhận Kiểm duyệt (APPROVE | HIDE | RESTORE)
  const [moderationModal, setModerationModal] = useState({
    isOpen: false,
    mode: 'HIDE', // 'APPROVE' | 'HIDE' | 'RESTORE'
    review: null,
    selectedPreset: VIOLATION_REASON_PRESETS[0],
    customReason: '',
    formError: ''
  });
  const [submittingModeration, setSubmittingModeration] = useState(false);

  // Guard chống Race Condition khi làm mới hoặc đổi tham số liên tục
  const requestIdRef = useRef(0);

  const pushToast = useCallback(
    (type, title, message) => {
      if (showToast) {
        showToast({ type, title, message });
      } else if (notify && typeof notify[type] === 'function') {
        notify[type](message || title);
      }
    },
    [showToast, notify]
  );

  // Tải toàn bộ đánh giá thật + đối chiếu thông tin sản phẩm & khách hàng thật từ Backend
  const fetchAllAdminReviews = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setReviews([]);
      setLoading(false);
      setError('Bạn không có quyền Quản trị viên (Admin) để truy cập dữ liệu kiểm duyệt đánh giá.');
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      // 1. Gọi GET /api/v1/admin/reviews
      const firstPage = await reviewService.getAdminReviews({
        page: 0,
        size: 500,
        sort: 'createdAt,desc'
      });

      let allRawReviews = [...(firstPage.content || [])];
      if (!firstPage.last && firstPage.totalPages > 1) {
        const extraPageCount = Math.min(firstPage.totalPages, 10);
        const extraPromises = [];
        for (let p = 1; p < extraPageCount; p += 1) {
          extraPromises.push(
            reviewService.getAdminReviews({ page: p, size: 500, sort: 'createdAt,desc' })
          );
        }
        const extraResults = await Promise.allSettled(extraPromises);
        extraResults.forEach((res) => {
          if (res.status === 'fulfilled' && Array.isArray(res.value?.content)) {
            allRawReviews = [...allRawReviews, ...res.value.content];
          }
        });
      }

      if (reqId !== requestIdRef.current) return;

      // 2. Song song tải thông tin sản phẩm & khách hàng thực tế (chỉ dùng API thật, không fallback mock)
      const [productsRes, customersRes, adminUsersRes] = await Promise.allSettled([
        api.get('/products', { params: { page: 0, size: 500 } }),
        api.get('/admin/customers', { params: { page: 0, size: 500, sortBy: 'id', sortDir: 'desc' } }),
        api.get('/admin/users', { params: { page: 0, size: 500, sortBy: 'id', sortDir: 'desc' } })
      ]);

      if (reqId !== requestIdRef.current) return;

      const productMap = new Map();
      if (productsRes.status === 'fulfilled') {
        extractArrayPayload(productsRes.value).forEach((rawProd) => {
          const p = normalizeProduct(rawProd);
          if (p && p.id != null) {
            productMap.set(String(p.id), p);
          }
        });
      }

      const customerMap = new Map();
      const ingestUsers = (payload) => {
        extractArrayPayload(payload).forEach((rawUser) => {
          const u = normalizeUser(rawUser);
          if (u && u.id != null && !customerMap.has(String(u.id))) {
            customerMap.set(String(u.id), u);
          }
        });
      };
      if (customersRes.status === 'fulfilled') ingestUsers(customersRes.value);
      if (adminUsersRes.status === 'fulfilled') ingestUsers(adminUsersRes.value);

      // Tải bổ sung các productId / userId có trong review nhưng chưa có trong danh sách 500 bản ghi đầu
      const missingProductIds = Array.from(
        new Set(
          allRawReviews
            .map((r) => r?.productId)
            .filter((pid) => pid != null && !productMap.has(String(pid)))
            .map((pid) => String(pid))
        )
      );
      const missingUserIds = Array.from(
        new Set(
          allRawReviews
            .map((r) => r?.userId)
            .filter((uid) => uid != null && !customerMap.has(String(uid)))
            .map((uid) => String(uid))
        )
      );

      if (missingProductIds.length > 0 || missingUserIds.length > 0) {
        const [extraProdResults, extraUserResults] = await Promise.all([
          Promise.allSettled(missingProductIds.map((pid) => api.get(`/products/${pid}`))),
          Promise.allSettled(missingUserIds.map((uid) => api.get(`/admin/customers/${uid}`)))
        ]);

        if (reqId !== requestIdRef.current) return;

        extraProdResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            const p = normalizeProduct(res.value);
            if (p && p.id != null) productMap.set(String(p.id), p);
          }
        });

        extraUserResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            const u = normalizeUser(res.value);
            if (u && u.id != null) customerMap.set(String(u.id), u);
          }
        });
      }

      // 3. Hợp nhất dữ liệu hiển thị thật từ Backend
      const enriched = allRawReviews.map((rev) => {
        const prod = rev.productId != null ? productMap.get(String(rev.productId)) : null;
        const cust = rev.userId != null ? customerMap.get(String(rev.userId)) : null;

        return {
          ...rev,
          productName: prod?.name || rev.productName || `Sản phẩm #${rev.productId ?? '—'}`,
          productImageUrl: prod?.imageUrl || prod?.image || null,
          productPrice: prod?.price ?? null,
          customerName:
            cust?.fullName ||
            cust?.name ||
            rev.userFullName ||
            `Khách hàng #${rev.userId ?? '—'}`,
          customerEmail: cust?.email || '',
          customerPhone: cust?.phone || '',
          customerAvatarUrl:
            (cust?.avatar && cust.avatar !== '' ? cust.avatar : null) ||
            rev.userAvatarUrl ||
            null
        };
      });

      setReviews(enriched);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setReviews([]);
      const status = err?.status || err?.response?.status;
      if (status === 403 || status === 401) {
        setError(
          err?.message ||
            'Tài khoản của bạn không có quyền Quản trị viên (ADMIN) để quản lý đánh giá.'
        );
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách đánh giá từ máy chủ. Vui lòng thử lại!'
        );
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    fetchAllAdminReviews();
  }, [fetchAllAdminReviews]);

  // Dashboard Thống kê từ 100% dữ liệu API thực tế
  const stats = useMemo(() => calculateAdminReviewStats(reviews), [reviews]);

  // Kiểm tra khoảng thời gian hợp lệ
  const dateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);

  // Áp dụng Tìm kiếm, Lọc số sao, Trạng thái, Khoảng ngày & Sắp xếp
  const filteredReviews = useMemo(() => {
    if (dateRangeInvalid) return [];
    return filterAdminReviews(reviews, {
      productQuery,
      customerQuery,
      ratingFilter,
      statusFilter,
      startDate,
      endDate,
      sortBy
    });
  }, [reviews, productQuery, customerQuery, ratingFilter, statusFilter, startDate, endDate, sortBy, dateRangeInvalid]);

  // Dữ liệu phân trang
  const paginatedReviews = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredReviews, currentPage, itemsPerPage]);

  const hasActiveFilter = Boolean(
    productQuery.trim() ||
      customerQuery.trim() ||
      Number(ratingFilter) > 0 ||
      statusFilter !== 'ALL' ||
      startDate ||
      endDate ||
      sortBy !== 'createdAt,desc'
  );

  const handleResetFilters = () => {
    setProductQuery('');
    setCustomerQuery('');
    setRatingFilter(0);
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt,desc');
    setCurrentPage(1);
  };

  // Mở Modal Xác nhận Kiểm duyệt (Duyệt / Ẩn / Hiện lại)
  const openModerationModal = (review, mode) => {
    if (!review || !isAdmin || submittingModeration) return;
    setModerationModal({
      isOpen: true,
      mode,
      review,
      selectedPreset: VIOLATION_REASON_PRESETS[0],
      customReason: '',
      formError: ''
    });
  };

  const closeModerationModal = () => {
    if (submittingModeration) return;
    setModerationModal((prev) => ({
      ...prev,
      isOpen: false,
      review: null,
      formError: ''
    }));
  };

  // Thực thi gọi API kiểm duyệt & CHỈ cập nhật giao diện sau khi API trả về thành công
  const handleConfirmModeration = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (submittingModeration || !moderationModal.review || !isAdmin) return;

    const { mode, review, selectedPreset, customReason } = moderationModal;
    const targetStatus =
      mode === 'HIDE' ? REVIEW_MODERATION_STATUS.HIDDEN : REVIEW_MODERATION_STATUS.APPROVED;

    let finalReason = null;
    if (mode === 'HIDE') {
      finalReason =
        selectedPreset === 'CUSTOM' ? customReason.trim() : String(selectedPreset || '').trim();
      if (!finalReason) {
        setModerationModal((prev) => ({
          ...prev,
          formError: 'Vui lòng chọn nhóm vi phạm hoặc nhập lý do ẩn đánh giá.'
        }));
        return;
      }
      if (finalReason.length > MAX_HIDDEN_REASON_LENGTH) {
        setModerationModal((prev) => ({
          ...prev,
          formError: `Lý do ẩn không được vượt quá ${MAX_HIDDEN_REASON_LENGTH} ký tự.`
        }));
        return;
      }
    }

    setSubmittingModeration(true);
    setModerationModal((prev) => ({ ...prev, formError: '' }));

    try {
      const updatedFromServer = await reviewService.moderateAdminReview(review.id, {
        status: targetStatus,
        reason: finalReason
      });

      const resolvedStatus = updatedFromServer?.status || targetStatus;
      const resolvedHiddenReason =
        resolvedStatus === REVIEW_MODERATION_STATUS.HIDDEN
          ? updatedFromServer?.hiddenReason ?? finalReason
          : null;
      const resolvedUpdatedAt = updatedFromServer?.updatedAt || new Date().toISOString();

      // Chỉ cập nhật danh sách & thống kê sau khi API Backend xác nhận thành công
      setReviews((prev) =>
        prev.map((item) =>
          String(item.id) === String(review.id)
            ? {
                ...item,
                status: resolvedStatus,
                hiddenReason: resolvedHiddenReason,
                updatedAt: resolvedUpdatedAt
              }
            : item
        )
      );

      setDetailReview((prev) =>
        prev && String(prev.id) === String(review.id)
          ? {
              ...prev,
              status: resolvedStatus,
              hiddenReason: resolvedHiddenReason,
              updatedAt: resolvedUpdatedAt
            }
          : prev
      );

      const actionLabel =
        mode === 'HIDE'
          ? 'Ẩn đánh giá vi phạm thành công'
          : mode === 'RESTORE'
            ? 'Khôi phục hiển thị đánh giá thành công'
            : 'Duyệt đánh giá thành công';

      pushToast(
        'success',
        actionLabel,
        `Đánh giá #${review.id} đã được chuyển sang trạng thái ${
          resolvedStatus === REVIEW_MODERATION_STATUS.HIDDEN ? 'Đã ẩn (HIDDEN)' : 'Đã duyệt (APPROVED)'
        }.`
      );

      setModerationModal((prev) => ({
        ...prev,
        isOpen: false,
        review: null,
        formError: ''
      }));
    } catch (err) {
      // API thất bại: GIỮ NGUYÊN trạng thái cũ và hiển thị thông báo lỗi
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể cập nhật trạng thái kiểm duyệt đánh giá. Vui lòng thử lại.';
      setModerationModal((prev) => ({
        ...prev,
        formError: errMsg
      }));
      pushToast('error', 'Kiểm duyệt đánh giá thất bại', errMsg);
    } finally {
      setSubmittingModeration(false);
    }
  };

  // Chốt bảo vệ phân quyền phía UI nếu có truy cập ngoài AdminRoute
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container page-container" style={{ padding: '2rem 1rem' }}>
        <ErrorMessage message="Bạn không có quyền Quản trị viên (ROLE_ADMIN) để truy cập trang quản lý đánh giá." />
      </div>
    );
  }

  return (
    <div data-testid="admin-reviews-page">
      {/* 1. HEADER TRANG QUẢN LÝ ĐÁNH GIÁ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.55rem',
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>⭐</span>
            <span>Quản lý &amp; Kiểm duyệt Đánh giá Sản phẩm</span>
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Kiểm duyệt nội dung nhận xét, duyệt đánh giá hợp lệ và ẩn đánh giá vi phạm quy chuẩn cộng đồng
          </p>
        </div>

        <button
          type="button"
          data-testid="admin-reviews-refresh-btn"
          onClick={fetchAllAdminReviews}
          disabled={loading || submittingModeration}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.55rem 1rem',
            cursor: loading || submittingModeration ? 'not-allowed' : 'pointer',
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

      {/* 2. DASHBOARD THỐNG KÊ ĐÁNH GIÁ (DỮ LIỆU THỰC TẾ TỪ API) */}
      <div
        data-testid="admin-reviews-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {[
          {
            testId: 'admin-reviews-kpi-total',
            label: 'Tổng số đánh giá',
            value: stats.totalReviews,
            sub: 'Toàn bộ đánh giá từ hệ thống',
            color: '#2563eb',
            bg: '#eff6ff',
            icon: '💬'
          },
          {
            testId: 'admin-reviews-kpi-pending',
            label: 'Đánh giá chờ duyệt',
            value: stats.pendingReviews,
            sub: 'Hàng đợi kiểm duyệt trước',
            color: '#d97706',
            bg: '#fef3c7',
            icon: '⏳'
          },
          {
            testId: 'admin-reviews-kpi-approved',
            label: 'Đánh giá đã duyệt',
            value: stats.approvedReviews,
            sub: 'Đang hiển thị công khai',
            color: '#16a34a',
            bg: '#dcfce7',
            icon: '✅'
          },
          {
            testId: 'admin-reviews-kpi-hidden',
            label: 'Đánh giá đã ẩn',
            value: stats.hiddenReviews,
            sub: 'Vi phạm / Đã bị ẩn công khai',
            color: '#dc2626',
            bg: '#fef2f2',
            icon: '🙈'
          },
          {
            testId: 'admin-reviews-kpi-avg',
            label: 'Điểm đánh giá TB',
            value: stats.totalReviews > 0 ? `${stats.averageRating.toFixed(1)} / 5` : '0.0 / 5',
            sub: `Tính trên ${stats.totalReviews} lượt`,
            color: '#f59e0b',
            bg: '#fffbeb',
            icon: '⭐'
          }
        ].map((card) => (
          <div
            key={card.testId}
            data-testid={card.testId}
            className="card"
            style={{
              padding: '1.05rem',
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
                backgroundColor: card.bg,
                color: card.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                flexShrink: 0
              }}
            >
              {card.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                {card.label}
              </div>
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: card.color,
                  lineHeight: 1.2
                }}
              >
                {card.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                {card.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. THANH TÌM KIẾM & BỘ LỌC */}
      <div
        className="card"
        data-testid="admin-reviews-filter-bar"
        style={{
          padding: '1.1rem 1.25rem',
          marginBottom: '1.5rem',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
            gap: '0.75rem',
            alignItems: 'center'
          }}
        >
          {/* Tìm kiếm theo tên / mã sản phẩm */}
          <input
            type="text"
            data-testid="admin-reviews-search-product"
            aria-label="Tìm kiếm theo tên sản phẩm"
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="🔍 Tìm theo tên hoặc ID sản phẩm..."
            style={{
              width: '100%',
              padding: '0.52rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}
          />

          {/* Tìm kiếm theo tên / mã khách hàng */}
          <input
            type="text"
            data-testid="admin-reviews-search-customer"
            aria-label="Tìm kiếm theo tên khách hàng"
            value={customerQuery}
            onChange={(e) => {
              setCustomerQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="👤 Tìm theo tên hoặc ID khách hàng..."
            style={{
              width: '100%',
              padding: '0.52rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}
          />

          {/* Lọc theo số sao */}
          <select
            data-testid="admin-reviews-rating-filter"
            aria-label="Lọc theo số sao"
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.52rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value={0}>Số sao: Tất cả (1–5 ★)</option>
            <option value={5}>5 Sao ★★★★★</option>
            <option value={4}>4 Sao ★★★★</option>
            <option value={3}>3 Sao ★★★</option>
            <option value={2}>2 Sao ★★</option>
            <option value={1}>1 Sao ★</option>
          </select>

          {/* Lọc theo trạng thái kiểm duyệt */}
          <select
            data-testid="admin-reviews-status-filter"
            aria-label="Lọc theo trạng thái kiểm duyệt"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.52rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value={REVIEW_MODERATION_STATUS.PENDING}>⏳ Chờ duyệt (PENDING)</option>
            <option value={REVIEW_MODERATION_STATUS.APPROVED}>✓ Đã duyệt (APPROVED)</option>
            <option value={REVIEW_MODERATION_STATUS.HIDDEN}>🙈 Đã ẩn (HIDDEN)</option>
          </select>

          {/* Sắp xếp mới nhất / cũ nhất */}
          <select
            data-testid="admin-reviews-sort-select"
            aria-label="Sắp xếp đánh giá"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.52rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="createdAt,desc">Sắp xếp: Mới nhất</option>
            <option value="createdAt,asc">Sắp xếp: Cũ nhất</option>
            <option value="rating,desc">Sắp xếp: Số sao cao nhất</option>
            <option value="rating,asc">Sắp xếp: Số sao thấp nhất</option>
          </select>
        </div>

        {/* Bộ lọc khoảng thời gian & tổng kết quả */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.65rem',
            borderTop: '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
              📅 Khoảng thời gian:
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <label htmlFor="review-filter-start" style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Từ ngày
              </label>
              <input
                id="review-filter-start"
                data-testid="admin-reviews-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.38rem 0.6rem',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <label htmlFor="review-filter-end" style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Đến ngày
              </label>
              <input
                id="review-filter-end"
                data-testid="admin-reviews-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.38rem 0.6rem',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            {dateRangeInvalid && (
              <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                ⚠️ Ngày bắt đầu không được lớn hơn ngày kết thúc.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.82rem', color: '#64748b' }}>
            <span>
              Kết quả: <strong>{filteredReviews.length}</strong> / {reviews.length} đánh giá
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                data-testid="admin-reviews-reset-filters-btn"
                onClick={handleResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.82rem'
                }}
              >
                🔄 Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH ĐÁNH GIÁ SẢN PHẨM */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px' }}>
        {loading ? (
          <div data-testid="admin-reviews-loading" style={{ padding: '3.5rem 1rem' }}>
            <Loading message="Đang tải danh sách đánh giá sản phẩm từ máy chủ..." />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div
            data-testid="admin-reviews-empty"
            style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⭐</div>
            <h3 style={{ margin: '0 0 0.45rem', color: '#0f172a', fontSize: '1.08rem', fontWeight: 700 }}>
              {hasActiveFilter
                ? 'Không tìm thấy đánh giá nào khớp với bộ lọc'
                : 'Hệ thống chưa có đánh giá sản phẩm nào'}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>
              {hasActiveFilter
                ? 'Hãy thử điều chỉnh từ khóa tìm kiếm, số sao, trạng thái hoặc khoảng thời gian.'
                : 'Đánh giá từ khách hàng sau khi nhận hàng sẽ tự động hiển thị tại đây.'}
            </p>
            {hasActiveFilter && (
              <Button variant="primary" size="sm" onClick={handleResetFilters}>
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table
                className="data-table"
                data-testid="admin-reviews-table"
                style={{ width: '100%', minWidth: '1020px', borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr>
                    <th style={{ width: '78px', whiteSpace: 'nowrap' }}>ID</th>
                    <th style={{ minWidth: '210px' }}>Sản phẩm</th>
                    <th style={{ minWidth: '165px' }}>Khách hàng</th>
                    <th style={{ width: '125px', whiteSpace: 'nowrap' }}>Số sao</th>
                    <th style={{ minWidth: '240px' }}>Nội dung bình luận</th>
                    <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Ngày đánh giá</th>
                    <th style={{ width: '120px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      Trạng thái
                    </th>
                    <th style={{ minWidth: '210px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReviews.map((review) => {
                    const statusUpper = String(
                      review.status || REVIEW_MODERATION_STATUS.APPROVED
                    ).toUpperCase();
                    const isHidden = statusUpper === REVIEW_MODERATION_STATUS.HIDDEN;
                    const isPending = statusUpper === REVIEW_MODERATION_STATUS.PENDING;

                    return (
                      <tr key={review.id} data-testid={`admin-review-row-${review.id}`}>
                        {/* ID đánh giá */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>#{review.id}</div>
                          {review.orderId && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Đơn #{review.orderId}
                            </div>
                          )}
                        </td>

                        {/* Hình ảnh & Tên sản phẩm */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <img
                              src={review.productImageUrl || DEFAULT_PRODUCT_THUMB}
                              alt={review.productName}
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#ffffff',
                                flexShrink: 0
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.84rem',
                                  color: '#0f172a',
                                  lineHeight: 1.3
                                }}
                              >
                                {review.productName}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Mã SP: #{review.productId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tên khách hàng */}
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#0f172a' }}>
                            {review.customerName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {review.customerEmail || `User ID: #${review.userId}`}
                          </div>
                        </td>

                        {/* Số sao */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {renderStarIcons(review.rating, '0.95rem')}
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>
                              {review.rating} / 5 sao
                            </span>
                          </div>
                        </td>

                        {/* Nội dung bình luận & Lý do ẩn nếu có */}
                        <td>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              color: '#1e293b',
                              lineHeight: 1.45,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                            title={review.comment}
                          >
                            {review.comment || '(Không có bình luận)'}
                          </div>
                          {isHidden && review.hiddenReason && (
                            <div
                              data-testid={`admin-review-hidden-reason-${review.id}`}
                              style={{
                                marginTop: '0.25rem',
                                fontSize: '0.74rem',
                                color: '#b91c1c',
                                fontWeight: 600
                              }}
                            >
                              Lý do ẩn: {review.hiddenReason}
                            </div>
                          )}
                        </td>

                        {/* Ngày đánh giá */}
                        <td style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                          {fmtDateTime(review.createdAt)}
                        </td>

                        {/* Trạng thái kiểm duyệt */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <ReviewStatusBadge status={statusUpper} />
                        </td>

                        {/* Các thao tác quản lý */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              type="button"
                              data-testid={`admin-review-detail-btn-${review.id}`}
                              onClick={() => setDetailReview(review)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              👁️ Chi tiết
                            </button>

                            {isPending && (
                              <button
                                type="button"
                                data-testid={`admin-review-approve-btn-${review.id}`}
                                disabled={submittingModeration}
                                onClick={() => openModerationModal(review, 'APPROVE')}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '6px',
                                  border: '1px solid #16a34a',
                                  backgroundColor: '#dcfce7',
                                  color: '#166534',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: submittingModeration ? 'not-allowed' : 'pointer'
                                }}
                              >
                                ✓ Duyệt
                              </button>
                            )}

                            {!isHidden ? (
                              <button
                                type="button"
                                data-testid={`admin-review-hide-btn-${review.id}`}
                                disabled={submittingModeration}
                                onClick={() => openModerationModal(review, 'HIDE')}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '6px',
                                  border: '1px solid #fca5a5',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: submittingModeration ? 'not-allowed' : 'pointer'
                                }}
                              >
                                🙈 Ẩn
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-testid={`admin-review-restore-btn-${review.id}`}
                                disabled={submittingModeration}
                                onClick={() => openModerationModal(review, 'RESTORE')}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '6px',
                                  border: '1px solid #86efac',
                                  backgroundColor: '#f0fdf4',
                                  color: '#15803d',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: submittingModeration ? 'not-allowed' : 'pointer'
                                }}
                              >
                                🔄 Hiện lại
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

            {/* PHÂN TRANG */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <Pagination
                currentPage={currentPage}
                totalItems={filteredReviews.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(nextPage) => setCurrentPage(nextPage)}
                onItemsPerPageChange={(nextSize) => {
                  setItemsPerPage(nextSize);
                  setCurrentPage(1);
                }}
                unitName="đánh giá"
              />
            </div>
          </>
        )}
      </div>

      {/* 5. MODAL XEM CHI TIẾT ĐÁNH GIÁ */}
      <Modal
        isOpen={Boolean(detailReview)}
        onClose={() => setDetailReview(null)}
        title={detailReview ? `Chi tiết Đánh giá #${detailReview.id}` : 'Chi tiết đánh giá'}
        footer={
          detailReview && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setDetailReview(null)}>
                Đóng
              </Button>
              {String(detailReview.status || '').toUpperCase() !== REVIEW_MODERATION_STATUS.HIDDEN ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={submittingModeration}
                  onClick={() => openModerationModal(detailReview, 'HIDE')}
                >
                  🙈 Ẩn đánh giá này
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={submittingModeration}
                  onClick={() => openModerationModal(detailReview, 'RESTORE')}
                >
                  🔄 Hiện lại đánh giá
                </Button>
              )}
            </>
          )
        }
      >
        {detailReview && (
          <div
            data-testid="admin-review-detail-modal"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Sản phẩm được đánh giá */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <img
                src={detailReview.productImageUrl || DEFAULT_PRODUCT_THUMB}
                alt={detailReview.productName}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid #cbd5e1',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  {detailReview.productName}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  Mã sản phẩm: #{detailReview.productId} •{' '}
                  <Link
                    to={`/products/${detailReview.productId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563eb', fontWeight: 600 }}
                  >
                    Xem trang sản phẩm ↗
                  </Link>
                </div>
              </div>
            </div>

            {/* Khách hàng & Trạng thái */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '0.75rem',
                fontSize: '0.84rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Khách hàng</div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{detailReview.customerName}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {detailReview.customerEmail || `User ID #${detailReview.userId}`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                  Trạng thái hiện tại
                </div>
                <ReviewStatusBadge status={detailReview.status} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ngày đánh giá</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {fmtDateTime(detailReview.createdAt)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Đơn hàng xác thực</div>
                <div style={{ fontWeight: 600, color: '#166534' }}>
                  ✓ Đơn #{detailReview.orderId || '—'}
                </div>
              </div>
            </div>

            {/* Số sao & Nội dung bình luận */}
            <div
              style={{
                padding: '0.9rem',
                borderRadius: '10px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                {renderStarIcons(detailReview.rating, '1.15rem')}
                <strong style={{ fontSize: '0.88rem', color: '#92400e' }}>
                  {detailReview.rating}/5 sao — {STAR_RATING_LABELS[detailReview.rating] || ''}
                </strong>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line'
                }}
              >
                {detailReview.comment || '(Khách hàng không nhập nội dung bình luận)'}
              </p>
            </div>

            {String(detailReview.status || '').toUpperCase() === REVIEW_MODERATION_STATUS.HIDDEN &&
              detailReview.hiddenReason && (
                <div
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  🙈 <strong>Lý do đã ẩn:</strong> {detailReview.hiddenReason}
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* 6. MODAL XÁC NHẬN DUYỆT / ẨN VI PHẠM / HIỆN LẠI ĐÁNH GIÁ */}
      <Modal
        isOpen={moderationModal.isOpen}
        onClose={closeModerationModal}
        title={
          moderationModal.mode === 'HIDE'
            ? `Ẩn đánh giá vi phạm #${moderationModal.review?.id || ''}`
            : moderationModal.mode === 'RESTORE'
              ? `Khôi phục hiển thị đánh giá #${moderationModal.review?.id || ''}`
              : `Xác nhận duyệt đánh giá #${moderationModal.review?.id || ''}`
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={submittingModeration}
              data-testid="admin-moderation-cancel-btn"
              onClick={closeModerationModal}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant={moderationModal.mode === 'HIDE' ? 'danger' : 'primary'}
              size="sm"
              disabled={submittingModeration}
              data-testid="admin-moderation-confirm-btn"
              onClick={handleConfirmModeration}
            >
              {submittingModeration
                ? 'Đang xử lý...'
                : moderationModal.mode === 'HIDE'
                  ? 'Xác nhận ẩn đánh giá'
                  : moderationModal.mode === 'RESTORE'
                    ? 'Xác nhận hiện lại'
                    : 'Xác nhận duyệt'}
            </Button>
          </>
        }
      >
        {moderationModal.review && (
          <form
            data-testid="admin-moderation-modal-form"
            onSubmit={handleConfirmModeration}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
          >
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.84rem'
              }}
            >
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                {moderationModal.review.customerName} — {moderationModal.review.productName}
              </div>
              <div style={{ color: '#475569', fontStyle: 'italic' }}>
                &ldquo;{moderationModal.review.comment}&rdquo;
              </div>
            </div>

            {moderationModal.mode === 'HIDE' ? (
              <div>
                <label
                  htmlFor="violation-reason-select"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '0.4rem'
                  }}
                >
                  Chọn nhóm vi phạm quy chuẩn <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <select
                  id="violation-reason-select"
                  data-testid="admin-hide-reason-select"
                  value={moderationModal.selectedPreset}
                  disabled={submittingModeration}
                  onChange={(e) =>
                    setModerationModal((prev) => ({
                      ...prev,
                      selectedPreset: e.target.value,
                      formError: ''
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '0.52rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    marginBottom: '0.65rem'
                  }}
                >
                  {VIOLATION_REASON_PRESETS.map((reasonText) => (
                    <option key={reasonText} value={reasonText}>
                      {reasonText}
                    </option>
                  ))}
                  <option value="CUSTOM">Lý do khác (Tự nhập chi tiết)...</option>
                </select>

                {moderationModal.selectedPreset === 'CUSTOM' && (
                  <div>
                    <textarea
                      rows={3}
                      data-testid="admin-hide-custom-reason-input"
                      value={moderationModal.customReason}
                      maxLength={MAX_HIDDEN_REASON_LENGTH}
                      disabled={submittingModeration}
                      onChange={(e) =>
                        setModerationModal((prev) => ({
                          ...prev,
                          customReason: e.target.value,
                          formError: ''
                        }))
                      }
                      placeholder="Nhập lý do ẩn đánh giá (tối đa 255 ký tự)..."
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right', marginTop: '2px' }}>
                      {moderationModal.customReason.length} / {MAX_HIDDEN_REASON_LENGTH} ký tự
                    </div>
                  </div>
                )}

                <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>
                  ⚠️ Sau khi ẩn, đánh giá này sẽ lập tức không xuất hiện trên trang Chi tiết sản phẩm của khách hàng.
                </p>
              </div>
            ) : moderationModal.mode === 'RESTORE' ? (
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn khôi phục đánh giá <strong>#{moderationModal.review.id}</strong> sang trạng thái{' '}
                <strong style={{ color: '#166534' }}>Đã duyệt (APPROVED)</strong> để hiển thị lại công khai cho khách hàng không?
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn duyệt đánh giá <strong>#{moderationModal.review.id}</strong> để hiển thị công khai trên trang sản phẩm không?
              </p>
            )}

            {moderationModal.formError && (
              <div
                role="alert"
                data-testid="admin-moderation-error"
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                ❌ {moderationModal.formError}
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminReviews;

