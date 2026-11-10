import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';
import reviewService, {
  evaluateReviewEligibility,
  STAR_RATING_LABELS
} from '../../services/reviewService';
import ProductReviewForm from './ProductReviewForm';
import Loading from '../common/Loading';
import ErrorMessage from '../common/ErrorMessage';

const renderStars = (ratingValue = 0, size = '1rem') => {
  const rounded = Math.round(Number(ratingValue) || 0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{ color: star <= rounded ? '#f59e0b' : '#cbd5e1' }}>
          ★
        </span>
      ))}
    </span>
  );
};

/**
 * Khu vực Đánh giá & Nhận xét sản phẩm trên trang ProductDetail (/products/:id).
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

  // State danh sách đánh giá công khai từ Backend
  const [summary, setSummary] = useState({
    productId,
    averageRating: 0,
    totalReviews: 0,
    reviews: {
      content: [],
      pageNumber: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true
    }
  });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [starFilter, setStarFilter] = useState(0); // 0 = Tất cả, 1..5 = lọc theo số sao
  const pageSize = 5;

  // State điều kiện đánh giá của user hiện tại
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [eligibilityError, setEligibilityError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingMyReview, setIsEditingMyReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  const requestIdRef = useRef(0);

  // 1. Tải danh sách đánh giá công khai từ GET /api/v1/products/{productId}/reviews
  const fetchProductReviews = useCallback(
    async (pageToLoad = currentPage) => {
      if (!productId) return;
      const reqId = ++requestIdRef.current;
      setLoadingReviews(true);
      setReviewsError('');

      try {
        const data = await reviewService.getProductReviews(productId, {
          page: Math.max(0, pageToLoad - 1),
          size: pageSize,
          sort: 'createdAt,desc'
        });
        if (reqId !== requestIdRef.current) return;

        setSummary(data);
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
    [productId, currentPage, onSummaryChange]
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
    setStarFilter(0);
    setIsFormOpen(false);
    setIsEditingMyReview(false);
  }, [productId]);

  useEffect(() => {
    fetchProductReviews(currentPage);
  }, [fetchProductReviews, currentPage]);

  useEffect(() => {
    fetchUserReviewEligibility();
  }, [fetchUserReviewEligibility]);

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

  const reviewItems = summary?.reviews?.content || [];
  const totalPages = Math.max(1, Number(summary?.reviews?.totalPages || 1));

  // Lọc theo số sao trên trang hiện tại nếu người dùng bấm filter pill
  const displayedReviews = useMemo(() => {
    if (!starFilter) return reviewItems;
    return reviewItems.filter((item) => Number(item.rating) === Number(starFilter));
  }, [reviewItems, starFilter]);

  // Thống kê phân bổ số sao từ các đánh giá hiện có
  const starDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewItems.forEach((r) => {
      const s = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
      if (counts[s] !== undefined) counts[s] += 1;
    });
    return counts;
  }, [reviewItems]);

  const handleReviewSaved = async (savedReview) => {
    setMyReview(savedReview);
    setIsFormOpen(false);
    setIsEditingMyReview(false);
    await fetchProductReviews(1);
    setCurrentPage(1);
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
      await fetchProductReviews(1);
      setCurrentPage(1);
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
          backgroundColor: '#ffffff'
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
              <span>💬</span>
              <span>Đánh giá &amp; Nhận xét từ khách hàng đã mua</span>
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              100% đánh giá được xác thực từ các đơn hàng đã giao thành công trên hệ thống
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchProductReviews(currentPage);
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

        {/* KHỐI 1: TỔNG QUAN ĐIỂM ĐÁNH GIÁ & PHÂN BỔ SAO */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            padding: '1.25rem',
            borderRadius: '16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem'
          }}
        >
          {/* Điểm trung bình */}
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
                fontSize: '2.75rem',
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1
              }}
            >
              {summary.totalReviews > 0 ? Number(summary.averageRating || 0).toFixed(1) : '0.0'}
              <span style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 700 }}>/5</span>
            </div>
            <div style={{ margin: '0.5rem 0 0.35rem' }}>
              {renderStars(summary.averageRating, '1.35rem')}
            </div>
            <div
              data-testid="review-total-count"
              style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}
            >
              {summary.totalReviews > 0
                ? `Dựa trên ${summary.totalReviews} đánh giá thực tế`
                : 'Chưa có đánh giá nào'}
            </div>
          </div>

          {/* Thanh phân bổ 5 sao -> 1 sao */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.45rem' }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starDistribution[star] || 0;
              const baseTotal = reviewItems.length || 1;
              const pct = reviewItems.length > 0 ? Math.round((count / baseTotal) * 100) : 0;
              return (
                <div
                  key={star}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.8rem'
                  }}
                >
                  <span style={{ width: '48px', fontWeight: 700, color: '#334155', flexShrink: 0 }}>
                    {star} ★
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: '8px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: '#f59e0b',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <span style={{ width: '36px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KHỐI 2: KIỂM TRA ĐIỀU KIỆN ĐÁNH GIÁ & FORM ĐÁNH GIÁ SAU MUA */}
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
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px'
                        }}
                      >
                        ✓ Đánh giá của bạn
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
                    {renderStars(myReview.rating, '1.1rem')}
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      {myReview.rating}/5 sao — {STAR_RATING_LABELS[myReview.rating] || ''}
                    </strong>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.5 }}>
                    {myReview.comment || '(Không có nội dung nhận xét)'}
                  </p>
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

        {/* KHỐI 3: BỘ LỌC SỐ SAO & DANH SÁCH ĐÁNH GIÁ TỪ BACKEND */}
        {reviewItems.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginRight: '0.25rem' }}>
              Lọc theo số sao:
            </span>
            {[
              { value: 0, label: 'Tất cả' },
              { value: 5, label: '5 Sao' },
              { value: 4, label: '4 Sao' },
              { value: 3, label: '3 Sao' },
              { value: 2, label: '2 Sao' },
              { value: 1, label: '1 Sao' }
            ].map((pill) => {
              const active = starFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setStarFilter(pill.value)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    border: active ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#1d4ed8' : '#475569',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Trạng thái Loading / Error / Empty / Danh sách đánh giá */}
        {loadingReviews ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <Loading message="Đang tải danh sách đánh giá thực tế từ máy chủ..." />
          </div>
        ) : reviewsError ? (
          <div style={{ padding: '1rem 0' }}>
            <ErrorMessage message={reviewsError} />
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => fetchProductReviews(currentPage)}
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
                ? `Không có đánh giá ${starFilter} sao nào ở trang này`
                : 'Chưa có đánh giá nào cho sản phẩm này'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              {starFilter > 0
                ? 'Hãy chọn bộ lọc "Tất cả" để xem toàn bộ nhận xét từ khách hàng.'
                : 'Hãy là khách hàng đầu tiên sở hữu sản phẩm và để lại nhận xét thực tế!'}
            </p>
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

              return (
                <div
                  key={review.id}
                  data-testid={`review-item-${review.id}`}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: '14px',
                    border: isOwnReview ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                    backgroundColor: isOwnReview ? '#f8fbff' : '#ffffff'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: isOwnReview ? '#2563eb' : '#e2e8f0',
                          color: isOwnReview ? '#ffffff' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}
                      >
                        KH
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                            {isOwnReview
                              ? `${user?.fullName || 'Bạn'} (Bạn)`
                              : `Khách hàng #${review.userId}`}
                          </strong>
                          <span
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '9999px'
                            }}
                          >
                            ✓ Đã mua hàng (Đơn #{review.orderId})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleString('vi-VN')
                            : 'Vừa đánh giá'}
                          {review.updatedAt &&
                            review.createdAt &&
                            review.updatedAt !== review.createdAt && (
                              <span> (Đã chỉnh sửa)</span>
                            )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {renderStars(review.rating, '1.05rem')}
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color: '#92400e',
                          backgroundColor: '#fef3c7',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {review.rating}/5
                      </span>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: '0.4rem 0 0',
                      fontSize: '0.9rem',
                      color: '#1e293b',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {review.comment || 'Khách hàng đã đánh giá sản phẩm.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Phân trang danh sách đánh giá */}
        {!loadingReviews && !reviewsError && totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9'
            }}
          >
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '0.45rem 0.9rem',
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

            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
              Trang <strong>{currentPage}</strong> / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '0.45rem 0.9rem',
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
    </section>
  );
};

export default ProductReviewsSection;

