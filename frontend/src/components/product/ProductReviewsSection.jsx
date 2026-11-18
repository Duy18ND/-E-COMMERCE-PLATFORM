import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';
import reviewService, {
  evaluateReviewEligibility,
  calculateStarDistribution,
  filterAndSortReviews,
  subscribeReviewModerationSync,
  REVIEW_MODERATION_STATUS,
  STAR_RATING_LABELS,
  REVIEW_SORT_OPTIONS
} from '../../services/reviewService';
import ProductReviewForm from './ProductReviewForm';
import Loading from '../common/Loading';
import ErrorMessage from '../common/ErrorMessage';

/**
 * Hiển thị dãy 5 ngôi sao hỗ trợ cả điểm lẻ thập phân (ví dụ: 4.5 sao) và điểm nguyên.
 */
export const renderRatingStars = (ratingValue = 0, size = '1.05rem') => {
  const safeRating = Math.max(0, Math.min(5, Number(ratingValue) || 0));
  return (
    <span
      aria-label={`${safeRating} trên 5 sao`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: size,
        lineHeight: 1
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fillRatio = Math.max(0, Math.min(1, safeRating - (star - 1)));
        const fillPercent = Math.round(fillRatio * 100);

        if (fillPercent >= 95) {
          return (
            <span key={star} style={{ color: '#f59e0b' }}>
              ★
            </span>
          );
        }
        if (fillPercent <= 5) {
          return (
            <span key={star} style={{ color: '#cbd5e1' }}>
              ★
            </span>
          );
        }
        return (
          <span
            key={star}
            style={{
              position: 'relative',
              display: 'inline-block',
              color: '#cbd5e1'
            }}
          >
            ★
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${fillPercent}%`,
                overflow: 'hidden',
                color: '#f59e0b'
              }}
            >
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
};

const getReviewerInitials = (name = '') => {
  const cleaned = String(name || '').trim();
  if (!cleaned) return 'KH';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};

/**
 * Khu vực Xếp hạng & Đánh giá của khách hàng tại trang Chi tiết sản phẩm (/products/:id).
 * Tích hợp 100% với API Backend thật (/api/v1/products/{productId}/reviews).
 */
const ProductReviewsSection = ({ product, onSummaryChange }) => {
  const productId = product?.id;
  const [searchParams] = useSearchParams();
  const initialOrderIdFromUrl = searchParams.get('orderId') || searchParams.get('reviewOrderId') || '';
  const autoOpenFromUrl =
    searchParams.get('review') === 'true' || Boolean(initialOrderIdFromUrl);

  const { user, isAuthenticated, isAdmin } = useAuth();
  const { notify, confirmDialog } = useNotification();

  // State tổng quan & danh sách đánh giá công khai từ Backend
  const [summary, setSummary] = useState({
    productId,
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    hasBackendDistribution: false,
    reviews: {
      content: [],
      pageNumber: 0,
      pageSize: 5,
      totalElements: 0,
      totalPages: 0,
      last: true
    }
  });
  // Lưu toàn bộ đánh giá thật đã duyệt của sản phẩm từ Backend để thống kê 1-5 sao & lọc chính xác
  const [allApprovedReviews, setAllApprovedReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  // Bộ lọc số sao, sắp xếp, phân trang & Load More
  const [starFilter, setStarFilter] = useState(0); // 0 = Tất cả, 1..5 = lọc theo số sao
  const [sortBy, setSortBy] = useState('createdAt,desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(5);
  const [paginationMode, setPaginationMode] = useState('page'); // 'page' | 'loadMore'
  const pageSize = 5;

  // State điều kiện đánh giá của user hiện tại
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [eligibilityError, setEligibilityError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingMyReview, setIsEditingMyReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [failedAvatarIds, setFailedAvatarIds] = useState({});

  const requestIdRef = useRef(0);

  // 1. Tải danh sách đánh giá công khai & thống kê từ GET /api/v1/products/{productId}/reviews
  const fetchProductReviews = useCallback(
    async (pageToLoad = 1, activeSort = sortBy) => {
      if (!productId) return;
      const reqId = ++requestIdRef.current;
      setLoadingReviews(true);
      setReviewsError('');

      try {
        const data = await reviewService.getProductReviews(productId, {
          page: Math.max(0, pageToLoad - 1),
          size: pageSize,
          sort: activeSort
        });
        if (reqId !== requestIdRef.current) return;

        let fullItems = data.reviews?.content || [];

        // Nếu tổng số đánh giá lớn hơn số phần tử của 1 trang, tải đầy đủ danh sách thật từ Backend
        // để biểu đồ tỷ lệ 1-5 sao và bộ lọc theo từng mức sao hiển thị chính xác 100%
        if (data.totalReviews > fullItems.length) {
          try {
            const fullData = await reviewService.getProductReviews(productId, {
              page: 0,
              size: Math.min(Math.max(data.totalReviews, pageSize), 200),
              sort: activeSort
            });
            if (reqId !== requestIdRef.current) return;
            if (Array.isArray(fullData.reviews?.content) && fullData.reviews.content.length > 0) {
              fullItems = fullData.reviews.content;
            }
          } catch {
            // Giữ dữ liệu trang hiện tại nếu request mở rộng gặp lỗi
          }
        }

        setSummary(data);
        setAllApprovedReviews(fullItems);

        if (typeof onSummaryChange === 'function') {
          onSummaryChange({
            averageRating: data.averageRating,
            totalReviews: data.totalReviews
          });
        }
      } catch (err) {
        if (reqId !== requestIdRef.current) return;
        setReviewsError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách đánh giá từ máy chủ. Vui lòng thử lại!'
        );
      } finally {
        if (reqId === requestIdRef.current) {
          setLoadingReviews(false);
        }
      }
    },
    [productId, sortBy, onSummaryChange]
  );

  // 2. Kiểm tra đánh giá cá nhân (/reviews/me) và đơn hàng thật (/orders/my-orders)
  const fetchUserReviewEligibility = useCallback(async () => {
    if (!productId || !isAuthenticated || !user || isAdmin) {
      setMyReview(null);
      setMyOrders([]);
      setEligibilityError('');
      return;
    }

    setCheckingEligibility(true);
    setEligibilityError('');

    try {
      const [myRevResult, ordersResult] = await Promise.allSettled([
        reviewService.getMyReview(productId),
        reviewService.getMyRealOrders()
      ]);

      const resolvedMyReview =
        myRevResult.status === 'fulfilled' ? myRevResult.value : null;
      const resolvedOrders =
        ordersResult.status === 'fulfilled' && Array.isArray(ordersResult.value)
          ? ordersResult.value
          : [];

      setMyReview(resolvedMyReview);
      setMyOrders(resolvedOrders);

      if (ordersResult.status === 'rejected' && !resolvedMyReview) {
        setEligibilityError(
          ordersResult.reason?.message ||
            'Không thể xác minh lịch sử mua hàng từ máy chủ.'
        );
      }
    } finally {
      setCheckingEligibility(false);
    }
  }, [productId, isAuthenticated, user, isAdmin]);

  useEffect(() => {
    setCurrentPage(1);
    setVisibleCount(pageSize);
    setPaginationMode('page');
    setStarFilter(0);
    setSortBy('createdAt,desc');
    setIsFormOpen(false);
    setIsEditingMyReview(false);
  }, [productId]);

  useEffect(() => {
    fetchProductReviews(currentPage, sortBy);
  }, [fetchProductReviews, currentPage, sortBy]);

  useEffect(() => {
    fetchUserReviewEligibility();
  }, [fetchUserReviewEligibility]);

  // Đồng bộ tự động với Admin Reviews (qua BroadcastChannel / CustomEvent khi Admin duyệt hoặc ẩn đánh giá)
  useEffect(() => {
    const unsubscribe = subscribeReviewModerationSync(() => {
      fetchProductReviews(currentPage, sortBy);
      fetchUserReviewEligibility();
    }, productId);

    const handleVisibilityRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchProductReviews(currentPage, sortBy);
      }
    };

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', handleVisibilityRefresh);
    }

    return () => {
      unsubscribe();
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      }
    };
  }, [productId, currentPage, sortBy, fetchProductReviews, fetchUserReviewEligibility]);

  // Đánh giá điều kiện gửi review của user hiện tại
  const eligibility = useMemo(() => {
    return evaluateReviewEligibility({
      isAuthenticated,
      user,
      orders: myOrders,
      productId,
      existingReview: myReview
    });
  }, [isAuthenticated, user, myOrders, productId, myReview]);

  // Tự động mở form nếu điều hướng từ trang Chi tiết đơn hàng (?review=true hoặc ?orderId=...)
  useEffect(() => {
    if (autoOpenFromUrl && eligibility.canReview) {
      setIsFormOpen(true);
    }
  }, [autoOpenFromUrl, eligibility.canReview]);

  // Nguồn dữ liệu đánh giá thực tế từ Backend
  const sourceReviews = useMemo(() => {
    if (allApprovedReviews.length > 0) return allApprovedReviews;
    return summary?.reviews?.content || [];
  }, [allApprovedReviews, summary]);

  // Thống kê phân bổ số sao (1-5 sao) và tỷ lệ phần trăm từ dữ liệu thực tế
  const starStats = useMemo(() => {
    return calculateStarDistribution(
      sourceReviews,
      summary?.hasBackendDistribution ? summary.ratingDistribution : null,
      summary?.totalReviews
    );
  }, [sourceReviews, summary]);

  // Danh sách sau khi áp dụng bộ lọc số sao & sắp xếp
  const filteredAndSortedReviews = useMemo(() => {
    return filterAndSortReviews(sourceReviews, {
      starFilter,
      sortBy
    });
  }, [sourceReviews, starFilter, sortBy]);

  // Tính toán tổng số trang dựa trên danh sách đã lọc hoặc tổng số phần tử từ Backend
  const totalFilteredCount =
    starFilter > 0
      ? filteredAndSortedReviews.length
      : Math.max(filteredAndSortedReviews.length, Number(summary?.totalReviews || 0));

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  // Danh sách hiển thị theo trang hiện tại hoặc theo chế độ Load More
  const displayedReviews = useMemo(() => {
    if (paginationMode === 'loadMore') {
      return filteredAndSortedReviews.slice(0, visibleCount);
    }
    // Nếu đang ở chế độ phân trang và không lọc sao + dữ liệu chỉ có đúng 1 trang từ server
    if (
      starFilter === 0 &&
      filteredAndSortedReviews.length <= pageSize &&
      Number(summary?.reviews?.pageNumber || 0) === currentPage - 1
    ) {
      return filteredAndSortedReviews;
    }
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAndSortedReviews.slice(startIdx, startIdx + pageSize);
  }, [filteredAndSortedReviews, paginationMode, visibleCount, starFilter, summary, currentPage]);

  const hasMoreToLoad = visibleCount < filteredAndSortedReviews.length;

  const handleSelectStarFilter = (starValue) => {
    const nextStar = starFilter === starValue ? 0 : starValue;
    setStarFilter(nextStar);
    setCurrentPage(1);
    setVisibleCount(pageSize);
    setPaginationMode('page');
  };

  const handleSortChange = (nextSort) => {
    setSortBy(nextSort);
    setCurrentPage(1);
    setVisibleCount(pageSize);
    setPaginationMode('page');
  };

  const handlePageChange = (nextPage) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    setPaginationMode('page');
    setCurrentPage(clamped);
    setVisibleCount(clamped * pageSize);
  };

  const handleLoadMore = () => {
    setPaginationMode('loadMore');
    setVisibleCount((prev) => prev + pageSize);
  };

  const handleReviewSaved = async (savedReview) => {
    setMyReview(savedReview);
    setIsFormOpen(false);
    setIsEditingMyReview(false);
    setCurrentPage(1);
    setVisibleCount(pageSize);
    await fetchProductReviews(1, sortBy);
  };

  const handleDeleteMyReview = async () => {
    if (!myReview?.id || deletingReview) return;

    const confirmed = confirmDialog
      ? await confirmDialog({
          title: 'Xác nhận xóa đánh giá',
          message: 'Bạn có chắc chắn muốn xóa bài đánh giá sản phẩm này không?',
          variant: 'danger',
          confirmText: 'Xóa đánh giá',
          cancelText: 'Hủy'
        })
      : true;

    if (!confirmed) return;

    setDeletingReview(true);
    try {
      await reviewService.deleteReview(productId, myReview.id);
      setMyReview(null);
      setIsEditingMyReview(false);
      if (notify?.success) {
        notify.success('Đã xóa bài đánh giá của bạn thành công.');
      }
      setCurrentPage(1);
      setVisibleCount(pageSize);
      await fetchProductReviews(1, sortBy);
    } catch (err) {
      if (notify?.error) {
        notify.error(err?.message || 'Không thể xóa đánh giá vào lúc này.');
      }
    } finally {
      setDeletingReview(false);
    }
  };

  return (
    <section
      id="product-reviews-section"
      data-testid="product-reviews-section"
      style={{ marginTop: '2rem' }}
    >
      <div
        className="card"
        style={{
          padding: 'clamp(1.25rem, 2.5vw, 2rem)',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)'
        }}
      >
        {/* Header khu vực đánh giá */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.15rem, 2vw, 1.4rem)',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>⭐</span>
              <span>Xếp hạng &amp; Đánh giá của khách hàng</span>
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Số liệu thống kê và nhận xét thực tế từ khách hàng đã mua sản phẩm tại ShopMart
            </p>
          </div>

          <button
            type="button"
            data-testid="refresh-reviews-button"
            onClick={() => {
              fetchProductReviews(currentPage, sortBy);
              fetchUserReviewEligibility();
            }}
            disabled={loadingReviews}
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#334155',
              cursor: loadingReviews ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>🔄</span>
            <span>Làm mới đánh giá</span>
          </button>
        </div>

        {/* KHỐI A: KHU VỰC TỔNG QUAN ĐÁNH GIÁ (ĐIỂM TRUNG BÌNH, TỔNG LƯỢT & BIỂU ĐỒ 1-5 SAO) */}
        <div
          data-testid="review-overview-box"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            padding: 'clamp(1rem, 2vw, 1.5rem)',
            borderRadius: '16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem'
          }}
        >
          {/* Cột trái: Điểm đánh giá trung bình & Tổng số lượt đánh giá */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0.5rem'
            }}
          >
            <div
              data-testid="review-average-rating"
              style={{
                fontSize: '2.85rem',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1
              }}
            >
              {summary.totalReviews > 0 ? Number(summary.averageRating || 0).toFixed(1) : '0.0'}
              <span style={{ fontSize: '1.25rem', color: '#64748b', fontWeight: 700 }}>/5 sao</span>
            </div>

            <div data-testid="review-average-stars" style={{ margin: '0.55rem 0 0.4rem' }}>
              {renderRatingStars(summary.totalReviews > 0 ? summary.averageRating : 0, '1.45rem')}
            </div>

            <div
              data-testid="review-total-count"
              style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}
            >
              {summary.totalReviews > 0
                ? `${summary.totalReviews} lượt đánh giá`
                : '0 lượt đánh giá (Chưa có đánh giá)'}
            </div>

            {summary.totalReviews > 0 && (
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, marginTop: '0.25rem' }}>
                ✓ 100% từ đơn hàng đã giao thành công
              </div>
            )}
          </div>

          {/* Cột phải: Biểu đồ thanh tỷ lệ đánh giá từng mức sao (5 sao -> 1 sao) */}
          <div
            data-testid="review-star-breakdown"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}
          >
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starStats.counts[star] || 0;
              const pct = starStats.percentages[star] || 0;
              const isSelectedStar = starFilter === star;

              return (
                <button
                  key={star}
                  type="button"
                  data-testid={`rating-breakdown-row-${star}`}
                  onClick={() => handleSelectStarFilter(star)}
                  title={`Nhấn để lọc các đánh giá ${star} sao (${count} lượt)`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    fontSize: '0.82rem',
                    background: isSelectedStar ? '#eff6ff' : 'transparent',
                    border: isSelectedStar ? '1px solid #bfdbfe' : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '0.25rem 0.45rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span
                    style={{
                      width: '54px',
                      fontWeight: 700,
                      color: isSelectedStar ? '#1d4ed8' : '#334155',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <span>{star} sao</span>
                    <span style={{ color: '#f59e0b' }}>★</span>
                  </span>

                  <div
                    style={{
                      flex: 1,
                      height: '9px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      data-testid={`rating-bar-${star}`}
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: star >= 4 ? '#f59e0b' : star === 3 ? '#fbbf24' : '#f97316',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  <span
                    data-testid={`rating-count-${star}`}
                    style={{
                      minWidth: '88px',
                      textAlign: 'right',
                      color: isSelectedStar ? '#1d4ed8' : '#475569',
                      fontWeight: 600,
                      fontSize: '0.78rem'
                    }}
                  >
                    {count} lượt ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* KHỐI KIỂM TRA ĐIỀU KIỆN ĐÁNH GIÁ & FORM ĐÁNH GIÁ SAU MUA */}
        <div
          data-testid="review-eligibility-box"
          style={{ marginBottom: '1.75rem' }}
        >
          {checkingEligibility ? (
            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.85rem',
                color: '#64748b',
                textAlign: 'center'
              }}
            >
              ⏳ Đang kiểm tra quyền đánh giá sản phẩm của bạn...
            </div>
          ) : !isAuthenticated ? (
            /* Trường hợp 1: Người dùng chưa đăng nhập */
            <div
              data-testid="review-not-logged-in"
              style={{
                padding: '1.1rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>
                  🔒 Bạn cần đăng nhập để gửi đánh giá sản phẩm
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Chỉ khách hàng đã đăng nhập và mua sản phẩm trong đơn hàng hoàn tất mới có thể viết nhận xét.
                </div>
              </div>
              <Link
                to="/login"
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                Đăng nhập ngay
              </Link>
            </div>
          ) : isAdmin ? (
            <div
              style={{
                padding: '0.9rem 1.15rem',
                borderRadius: '12px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: '0.85rem'
              }}
            >
              🛡️ <strong>Tài khoản Quản trị viên:</strong> Chức năng gửi đánh giá sau mua chỉ dành cho tài khoản Khách hàng.
            </div>
          ) : eligibility.reason === 'ALREADY_REVIEWED' && myReview ? (
            /* Trường hợp 5: Người dùng đã đánh giá trước đó */
            <div
              data-testid="review-already-submitted"
              style={{
                padding: '1.15rem 1.25rem',
                borderRadius: '14px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac'
              }}
            >
              {!isEditingMyReview ? (
                <>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          backgroundColor:
                            String(myReview.status || '').toUpperCase() === REVIEW_MODERATION_STATUS.HIDDEN
                              ? '#dc2626'
                              : '#16a34a',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px'
                        }}
                      >
                        {String(myReview.status || '').toUpperCase() === REVIEW_MODERATION_STATUS.HIDDEN
                          ? '🙈 Đánh giá của bạn (Đã bị Admin ẩn)'
                          : '✓ Đánh giá của bạn'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                        Đơn hàng #{myReview.orderId}
                      </span>
                      {myReview.createdAt && (
                        <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                          • {new Date(myReview.createdAt).toLocaleString('vi-VN')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        data-testid="edit-my-review-button"
                        onClick={() => setIsEditingMyReview(true)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #2563eb',
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Chỉnh sửa đánh giá
                      </button>
                      <button
                        type="button"
                        data-testid="delete-my-review-button"
                        disabled={deletingReview}
                        onClick={handleDeleteMyReview}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #fca5a5',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: deletingReview ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {deletingReview ? 'Đang xóa...' : '🗑️ Xóa'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    {renderRatingStars(myReview.rating, '1.1rem')}
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      {myReview.rating}/5 sao — {STAR_RATING_LABELS[myReview.rating] || ''}
                    </strong>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.5 }}>
                    {myReview.comment || '(Không có nội dung nhận xét)'}
                  </p>
                  {String(myReview.status || '').toUpperCase() === REVIEW_MODERATION_STATUS.HIDDEN && (
                    <div
                      data-testid="my-review-hidden-notice"
                      style={{
                        marginTop: '0.6rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      ⚠️ Đánh giá này đã bị Quản trị viên ẩn khỏi trang công khai
                      {myReview.hiddenReason ? ` (Lý do: ${myReview.hiddenReason})` : ''}.
                    </div>
                  )}
                </>
              ) : (
                <ProductReviewForm
                  product={product}
                  orderId={myReview.orderId}
                  initialReview={myReview}
                  onSuccess={handleReviewSaved}
                  onCancel={() => setIsEditingMyReview(false)}
                />
              )}
            </div>
          ) : eligibility.reason === 'ELIGIBLE' ? (
            /* Trường hợp 4: Đủ điều kiện đánh giá (Đã mua & Đơn hàng DELIVERED) */
            <div>
              {!isFormOpen ? (
                <div
                  data-testid="review-eligible-banner"
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: '14px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.95rem' }}>
                      🎉 Bạn đã mua và nhận thành công sản phẩm này (Đơn hàng #{eligibility.defaultOrder?.id})
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#3b82f6', marginTop: '0.2rem' }}>
                      Hãy chia sẻ đánh giá sao và cảm nhận thực tế của bạn về sản phẩm nhé!
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="open-review-form-button"
                    onClick={() => setIsFormOpen(true)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    ⭐ Viết đánh giá ngay
                  </button>
                </div>
              ) : (
                <ProductReviewForm
                  product={product}
                  orderId={
                    initialOrderIdFromUrl &&
                    eligibility.eligibleOrders.some((o) => String(o.id) === String(initialOrderIdFromUrl))
                      ? initialOrderIdFromUrl
                      : eligibility.defaultOrder?.id
                  }
                  orderInfo={eligibility.defaultOrder}
                  eligibleOrders={eligibility.eligibleOrders}
                  onSuccess={handleReviewSaved}
                  onCancel={() => setIsFormOpen(false)}
                />
              )}
            </div>
          ) : eligibility.reason === 'ORDER_NOT_COMPLETED' ? (
            /* Trường hợp 3: Đã mua nhưng đơn hàng chưa hoàn thành (chưa DELIVERED) */
            <div
              data-testid="review-order-not-completed"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }}>
                  ⏳ Đơn hàng #{eligibility.pendingOrder?.id} chứa sản phẩm này chưa hoàn tất giao hàng
                </div>
                <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '0.2rem' }}>
                  {eligibility.message}
                </div>
              </div>
              {eligibility.pendingOrder?.id && (
                <Link
                  to={`/orders/${eligibility.pendingOrder.id}`}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #f59e0b',
                    color: '#b45309',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textDecoration: 'none'
                  }}
                >
                  Xem đơn hàng #{eligibility.pendingOrder.id}
                </Link>
              )}
            </div>
          ) : (
            /* Trường hợp 2: Người dùng chưa mua sản phẩm này */
            <div
              data-testid="review-not-purchased"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                  🛍️ Chỉ khách hàng đã mua sản phẩm mới có thể gửi đánh giá
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {eligibilityError ||
                    'Bạn chưa có đơn hàng đã giao thành công nào chứa sản phẩm này. Hãy đặt mua và trải nghiệm sản phẩm để chia sẻ đánh giá nhé!'}
                </div>
              </div>
              <Link
                to="/orders"
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textDecoration: 'none'
                }}
              >
                Kiểm tra đơn hàng của tôi
              </Link>
            </div>
          )}
        </div>

        {/* KHỐI C: BỘ LỌC THEO SỐ SAO (5, 4, 3, 2, 1 SAO, TẤT CẢ) & SẮP XẾP (MỚI NHẤT / CŨ NHẤT / SỐ SAO) */}
        <div
          data-testid="review-filter-sort-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginBottom: '1.25rem'
          }}
        >
          {/* Bộ lọc theo mức sao */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginRight: '0.2rem' }}>
              Lọc theo:
            </span>
            <button
              type="button"
              data-testid="star-filter-all"
              onClick={() => handleSelectStarFilter(0)}
              style={{
                padding: '0.38rem 0.85rem',
                borderRadius: '9999px',
                border: starFilter === 0 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: starFilter === 0 ? '#eff6ff' : '#ffffff',
                color: starFilter === 0 ? '#1d4ed8' : '#475569',
                fontWeight: starFilter === 0 ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Tất cả ({summary.totalReviews || 0})
            </button>

            {[5, 4, 3, 2, 1].map((star) => {
              const active = starFilter === star;
              const count = starStats.counts[star] || 0;
              return (
                <button
                  key={star}
                  type="button"
                  data-testid={`star-filter-${star}`}
                  onClick={() => handleSelectStarFilter(star)}
                  style={{
                    padding: '0.38rem 0.85rem',
                    borderRadius: '9999px',
                    border: active ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#1d4ed8' : '#475569',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{star} Sao</span>
                  <span style={{ color: '#f59e0b' }}>★</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Bộ chọn sắp xếp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label
              htmlFor="review-sort-select"
              style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}
            >
              Sắp xếp:
            </label>
            <select
              id="review-sort-select"
              data-testid="review-sort-select"
              value={sortBy}
              disabled={loadingReviews}
              onChange={(e) => handleSortChange(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: loadingReviews ? 'not-allowed' : 'pointer',
                outline: 'none'
              }}
            >
              {REVIEW_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KHỐI B & D: TRẠNG THÁI LOADING / ERROR / EMPTY / DANH SÁCH BÌNH LUẬN & ĐÁNH GIÁ */}
        {loadingReviews ? (
          <div data-testid="reviews-loading-state" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <Loading message="Đang tải danh sách đánh giá thực tế từ máy chủ..." />
          </div>
        ) : reviewsError ? (
          <div data-testid="reviews-error-state" style={{ padding: '1rem 0' }}>
            <ErrorMessage message={reviewsError} />
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => fetchProductReviews(currentPage, sortBy)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Thử lại tải đánh giá
              </button>
            </div>
          </div>
        ) : displayedReviews.length === 0 ? (
          <div
            data-testid="reviews-empty-state"
            style={{
              padding: '2.75rem 1.25rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1px dashed #cbd5e1'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
            <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {starFilter > 0
                ? `Chưa có đánh giá ${starFilter} sao nào cho sản phẩm này`
                : 'Chưa có đánh giá nào cho sản phẩm này'}
            </h4>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              {starFilter > 0
                ? 'Hãy chọn bộ lọc "Tất cả" để xem toàn bộ nhận xét từ khách hàng.'
                : 'Hãy là khách hàng đầu tiên sở hữu sản phẩm và để lại nhận xét thực tế!'}
            </p>
            {starFilter > 0 && (
              <button
                type="button"
                data-testid="reset-star-filter-button"
                onClick={() => handleSelectStarFilter(0)}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '8px',
                  border: '1px solid #2563eb',
                  backgroundColor: '#ffffff',
                  color: '#2563eb',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Xem tất cả đánh giá
              </button>
            )}
          </div>
        ) : (
          <div
            data-testid="reviews-list"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {displayedReviews.map((review) => {
              const isOwnReview =
                user &&
                (String(review.userId) === String(user.id) ||
                  String(review.userId) === String(user.userId));

              const reviewerName =
                review.userFullName ||
                (isOwnReview ? `${user?.fullName || 'Bạn'} (Bạn)` : review.reviewerName || 'Khách hàng');

              const avatarUrl =
                !failedAvatarIds[review.id] &&
                (review.userAvatarUrl || (isOwnReview ? user?.avatarUrl : null));

              return (
                <article
                  key={review.id}
                  data-testid={`review-item-${review.id}`}
                  style={{
                    padding: '1.15rem 1.3rem',
                    borderRadius: '14px',
                    border: isOwnReview ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                    backgroundColor: isOwnReview ? '#f8fbff' : '#ffffff',
                    transition: 'box-shadow 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.65rem',
                      marginBottom: '0.6rem'
                    }}
                  >
                    {/* Thông tin người đánh giá & Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={reviewerName}
                          onError={() =>
                            setFailedAvatarIds((prev) => ({ ...prev, [review.id]: true }))
                          }
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #cbd5e1',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: isOwnReview ? '#2563eb' : '#e2e8f0',
                            color: isOwnReview ? '#ffffff' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}
                        >
                          {getReviewerInitials(reviewerName)}
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <strong
                            data-testid={`review-author-${review.id}`}
                            style={{ fontSize: '0.92rem', color: '#0f172a' }}
                          >
                            {reviewerName}
                          </strong>

                          {/* Nhãn xác nhận người mua khi Backend cung cấp orderId / verifiedPurchase */}
                          {(review.verifiedPurchase || review.orderId) && (
                            <span
                              data-testid={`verified-purchase-badge-${review.id}`}
                              style={{
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                border: '1px solid #86efac',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <span>✓</span>
                              <span>
                                Đã mua hàng{review.orderId ? ` (Đơn #${review.orderId})` : ''}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Ngày đánh giá */}
                        <div
                          data-testid={`review-date-${review.id}`}
                          style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}
                        >
                          Ngày đánh giá:{' '}
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleString('vi-VN')
                            : 'Vừa đánh giá'}
                          {review.updatedAt &&
                            review.createdAt &&
                            review.updatedAt !== review.createdAt && (
                              <span style={{ fontStyle: 'italic' }}> (Đã chỉnh sửa)</span>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Số sao đã đánh giá */}
                    <div
                      data-testid={`review-rating-${review.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}
                    >
                      {renderRatingStars(review.rating, '1.05rem')}
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          color: '#92400e',
                          backgroundColor: '#fef3c7',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {review.rating}/5 sao
                      </span>
                      {STAR_RATING_LABELS[review.rating] && (
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          • {STAR_RATING_LABELS[review.rating]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nội dung bình luận */}
                  <p
                    data-testid={`review-comment-${review.id}`}
                    style={{
                      margin: '0.45rem 0 0',
                      fontSize: '0.92rem',
                      color: '#1e293b',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {review.comment || 'Khách hàng đã đánh giá sản phẩm.'}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        {/* KHỐI PHÂN TRANG & NÚT XEM THÊM (LOAD MORE) */}
        {!loadingReviews && !reviewsError && (totalPages > 1 || hasMoreToLoad) && (
          <div
            data-testid="reviews-pagination"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              marginTop: '1.5rem',
              paddingTop: '1.15rem',
              borderTop: '1px solid #f1f5f9'
            }}
          >
            {/* Nút Load More tiện lợi */}
            {hasMoreToLoad && (
              <button
                type="button"
                data-testid="reviews-load-more-button"
                onClick={handleLoadMore}
                style={{
                  padding: '0.55rem 1.35rem',
                  borderRadius: '9999px',
                  border: '1px solid #2563eb',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                👇 Xem thêm đánh giá (Còn {filteredAndSortedReviews.length - displayedReviews.length} đánh giá)
              </button>
            )}

            {/* Điều hướng phân trang chuẩn */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                    color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Trang trước
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                  const isActivePage = paginationMode === 'page' && currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      data-testid={`reviews-page-btn-${pageNum}`}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        border: isActivePage ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: isActivePage ? '#2563eb' : '#ffffff',
                        color: isActivePage ? '#ffffff' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                    color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Trang sau →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductReviewsSection;
