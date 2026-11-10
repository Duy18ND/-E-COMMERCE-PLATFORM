import { useState, useEffect } from 'react';
import reviewService, {
  MAX_REVIEW_COMMENT_LENGTH,
  STAR_RATING_LABELS,
  validateReviewInput
} from '../../services/reviewService';
import useNotification from '../../hooks/useNotification';

const QUICK_REVIEW_SUGGESTIONS = [
  'Sản phẩm chính hãng, đóng gói rất cẩn thận.',
  'Chất lượng vượt mong đợi, giao hàng nhanh đúng hẹn.',
  'Máy hoạt động mượt mà, đúng mô tả của ShopMart.',
  'Đáng đồng tiền bát gạo, sẽ tiếp tục ủng hộ shop!'
];

/**
 * Form đánh giá sao và nội dung nhận xét sau khi mua hàng.
 * Tích hợp trực tiếp với API Backend:
 * - POST /api/v1/products/{productId}/reviews (tạo mới)
 * - PUT /api/v1/products/{productId}/reviews/{reviewId} (cập nhật đánh giá đã gửi)
 */
const ProductReviewForm = ({
  product = {},
  orderId = null,
  orderInfo = null,
  eligibleOrders = [],
  initialReview = null,
  onSuccess,
  onCancel,
  onDuplicateDetected
}) => {
  const { notify } = useNotification();
  const isEditMode = Boolean(initialReview && initialReview.id);

  const resolvedProductId = product?.id ?? product?.productId ?? initialReview?.productId;
  const resolvedProductName =
    product?.name || product?.productName || 'Sản phẩm đã mua tại ShopMart';
  const resolvedProductImage =
    product?.imageUrl ||
    product?.image ||
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80';

  const defaultSelectedOrderId =
    initialReview?.orderId ??
    orderId ??
    orderInfo?.id ??
    (eligibleOrders.length > 0 ? eligibleOrders[0].id : '');

  const [selectedOrderId, setSelectedOrderId] = useState(defaultSelectedOrderId || '');
  const [rating, setRating] = useState(initialReview?.rating ? Number(initialReview.rating) : 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    setSelectedOrderId(
      initialReview?.orderId ??
      orderId ??
      orderInfo?.id ??
      (eligibleOrders.length > 0 ? eligibleOrders[0].id : '')
    );
    setRating(initialReview?.rating ? Number(initialReview.rating) : 0);
    setComment(initialReview?.comment || '');
    setFieldErrors({});
    setSubmitError('');
    setSubmitSuccess('');
  }, [initialReview, orderId, orderInfo, eligibleOrders]);

  const activeStarValue = hoverRating || rating;
  const currentCharCount = comment.length;
  const isNearLimit = currentCharCount >= MAX_REVIEW_COMMENT_LENGTH * 0.9;

  const selectedOrderObject =
    orderInfo ||
    eligibleOrders.find((o) => String(o.id) === String(selectedOrderId)) ||
    null;

  const handleSelectStar = (starValue) => {
    if (submitting) return;
    setRating(starValue);
    if (fieldErrors.rating) {
      setFieldErrors((prev) => ({ ...prev, rating: '' }));
    }
    setSubmitError('');
  };

  const handleCommentChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_REVIEW_COMMENT_LENGTH) {
      setComment(val);
    } else {
      setComment(val.slice(0, MAX_REVIEW_COMMENT_LENGTH));
    }
    if (fieldErrors.comment) {
      setFieldErrors((prev) => ({ ...prev, comment: '' }));
    }
    setSubmitError('');
  };

  const handleAppendSuggestion = (suggestionText) => {
    if (submitting) return;
    setComment((prev) => {
      const base = prev.trim();
      const next = base ? `${base} ${suggestionText}` : suggestionText;
      return next.slice(0, MAX_REVIEW_COMMENT_LENGTH);
    });
    if (fieldErrors.comment) {
      setFieldErrors((prev) => ({ ...prev, comment: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitError('');
    setSubmitSuccess('');

    const validation = validateReviewInput({
      rating,
      comment,
      orderId: selectedOrderId,
      requireOrderId: !isEditMode
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setSubmitError(firstError);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      let savedReview;
      if (isEditMode) {
        savedReview = await reviewService.updateReview(resolvedProductId, initialReview.id, {
          rating: validation.sanitized.rating,
          comment: validation.sanitized.comment
        });
      } else {
        savedReview = await reviewService.createReview(resolvedProductId, {
          orderId: validation.sanitized.orderId,
          rating: validation.sanitized.rating,
          comment: validation.sanitized.comment
        });
      }

      const successText = isEditMode
        ? 'Cập nhật đánh giá sản phẩm thành công!'
        : 'Gửi đánh giá sản phẩm thành công! Cảm ơn bạn đã chia sẻ trải nghiệm mua sắm.';

      setSubmitSuccess(successText);
      if (notify?.success) {
        notify.success(successText);
      }

      if (typeof onSuccess === 'function') {
        onSuccess(savedReview, { isEditMode });
      }
    } catch (err) {
      const status = err?.status || err?.response?.status;
      let errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể gửi đánh giá sản phẩm vào lúc này. Vui lòng thử lại.';

      if (status === 409) {
        errMsg =
          err?.response?.data?.message ||
          'Bạn đã đánh giá sản phẩm này trước đó. Mỗi khách hàng chỉ được gửi 1 đánh giá cho mỗi sản phẩm.';
        if (typeof onDuplicateDetected === 'function') {
          onDuplicateDetected(resolvedProductId);
        }
      } else if (status === 403) {
        errMsg =
          err?.response?.data?.message ||
          'Bạn không có quyền đánh giá sản phẩm này (Đơn hàng không thuộc tài khoản của bạn).';
      } else if (status === 401) {
        errMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để gửi đánh giá.';
      }

      setSubmitError(errMsg);
      if (notify?.error) {
        notify.error(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="product-review-form"
      noValidate
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: 'clamp(1rem, 2.5vw, 1.5rem)',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
      }}
    >
      {/* Header Form */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          paddingBottom: '1rem',
          marginBottom: '1.1rem',
          borderBottom: '1px solid #f1f5f9'
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <span>⭐</span>
            <span>{isEditMode ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá sản phẩm sau mua'}</span>
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Đánh giá của bạn giúp những khách hàng khác đưa ra lựa chọn mua sắm chính xác hơn
          </p>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            backgroundColor: '#dcfce7',
            color: '#166534',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: '1px solid #86efac'
          }}
        >
          <span>✓</span>
          <span>Đã mua hàng xác thực</span>
        </span>
      </div>

      {/* 1. THÔNG TIN SẢN PHẨM & ĐƠN HÀNG LIÊN QUAN */}
      <div
        data-testid="review-product-info"
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
          <img
            src={resolvedProductImage}
            alt={resolvedProductName}
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'cover',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              flexShrink: 0
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: '#0f172a',
                lineHeight: 1.35,
                marginBottom: '0.25rem'
              }}
            >
              {resolvedProductName}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#475569'
              }}
            >
              <span>
                Đơn hàng liên quan:{' '}
                <strong style={{ color: '#2563eb' }}>
                  #{selectedOrderId || initialReview?.orderId || '---'}
                </strong>
              </span>
              {selectedOrderObject?.createdAt && (
                <span>
                  • Ngày đặt:{' '}
                  {new Date(selectedOrderObject.createdAt).toLocaleDateString('vi-VN')}
                </span>
              )}
              <span
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '1px 7px',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: 700
                }}
              >
                Trạng thái: Đã giao thành công (DELIVERED)
              </span>
            </div>
          </div>
        </div>

        {/* Nếu khách hàng có nhiều đơn hàng DELIVERED chứa sản phẩm này và đang tạo mới */}
        {!isEditMode && eligibleOrders.length > 1 && (
          <div style={{ minWidth: '190px' }}>
            <label
              htmlFor="review-order-select"
              style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
            >
              Chọn đơn hàng đánh giá:
            </label>
            <select
              id="review-order-select"
              value={selectedOrderId}
              disabled={submitting}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                backgroundColor: '#ffffff',
                color: '#0f172a'
              }}
            >
              {eligibleOrders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  Đơn #{ord.id} ({ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('vi-VN') : 'Đã giao'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. CHỌN SỐ SAO ĐÁNH GIÁ (1 - 5 SAO) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '0.5rem'
          }}
        >
          Mức độ hài lòng của bạn <span style={{ color: '#dc2626' }}>*</span>
        </label>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.85rem',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            backgroundColor: fieldErrors.rating ? '#fef2f2' : '#fffbeb',
            border: fieldErrors.rating ? '1px solid #fca5a5' : '1px solid #fde68a'
          }}
        >
          <div
            role="radiogroup"
            aria-label="Chọn số sao đánh giá từ 1 đến 5 sao"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const isSelected = star <= activeStarValue;
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} sao`}
                  data-testid={`star-button-${star}`}
                  disabled={submitting}
                  onClick={() => handleSelectStar(star)}
                  onMouseEnter={() => !submitting && setHoverRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.2rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '2rem',
                    lineHeight: 1,
                    color: isSelected ? '#f59e0b' : '#cbd5e1',
                    transform: hoverRating === star ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform 0.15s ease, color 0.15s ease',
                    textShadow: isSelected ? '0 2px 6px rgba(245, 158, 11, 0.35)' : 'none'
                  }}
                >
                  ★
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeStarValue > 0 ? (
              <>
                <span
                  data-testid="selected-rating-badge"
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px'
                  }}
                >
                  {activeStarValue} / 5 sao
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>
                  {STAR_RATING_LABELS[activeStarValue]}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                Chạm vào ngôi sao để chọn từ 1 đến 5 sao
              </span>
            )}
          </div>
        </div>

        {fieldErrors.rating && (
          <div
            role="alert"
            data-testid="rating-error"
            style={{ marginTop: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#dc2626' }}
          >
            ⚠️ {fieldErrors.rating}
          </div>
        )}
      </div>

      {/* 3. NỘI DUNG NHẬN XÉT ĐÁNH GIÁ */}
      <div style={{ marginBottom: '1.15rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.4rem',
            marginBottom: '0.45rem'
          }}
        >
          <label
            htmlFor="review-comment-textarea"
            style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}
          >
            Nội dung nhận xét <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <span
            data-testid="comment-char-counter"
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: isNearLimit ? '#d97706' : '#64748b'
            }}
          >
            Đã nhập: <strong>{currentCharCount}</strong> / {MAX_REVIEW_COMMENT_LENGTH} ký tự
          </span>
        </div>

        <textarea
          id="review-comment-textarea"
          data-testid="review-comment-textarea"
          rows={4}
          value={comment}
          disabled={submitting}
          maxLength={MAX_REVIEW_COMMENT_LENGTH}
          onChange={handleCommentChange}
          placeholder="Chia sẻ trải nghiệm thực tế của bạn về sản phẩm: thiết kế, chất lượng, hiệu năng, đóng gói và tốc độ giao hàng..."
          style={{
            width: '100%',
            padding: '0.75rem 0.9rem',
            borderRadius: '10px',
            border: fieldErrors.comment ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            color: '#0f172a',
            backgroundColor: submitting ? '#f8fafc' : '#ffffff',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />

        {fieldErrors.comment && (
          <div
            role="alert"
            data-testid="comment-error"
            style={{ marginTop: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#dc2626' }}
          >
            ⚠️ {fieldErrors.comment}
          </div>
        )}

        {/* Gợi ý nhanh */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.4rem',
            marginTop: '0.55rem'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Gợi ý nhanh:</span>
          {QUICK_REVIEW_SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              disabled={submitting}
              onClick={() => handleAppendSuggestion(item)}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '9999px',
                padding: '0.22rem 0.65rem',
                fontSize: '0.74rem',
                color: '#334155',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              + {item}
            </button>
          ))}
        </div>
      </div>

      {/* THÔNG BÁO LỖI HOẶC THÀNH CÔNG */}
      {submitError && (
        <div
          role="alert"
          data-testid="review-submit-error"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1rem'
          }}
        >
          ❌ {submitError}
        </div>
      )}

      {submitSuccess && (
        <div
          role="status"
          data-testid="review-submit-success"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1rem'
          }}
        >
          ✅ {submitSuccess}
        </div>
      )}

      {/* 4. NÚT THAO TÁC (GỬI ĐÁNH GIÁ & HỦY ĐÁNH GIÁ) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: '0.65rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {onCancel && (
          <button
            type="button"
            data-testid="cancel-review-button"
            disabled={submitting}
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            Hủy đánh giá
          </button>
        )}

        <button
          type="submit"
          data-testid="submit-review-button"
          disabled={submitting}
          style={{
            padding: '0.6rem 1.35rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: submitting ? '#94a3b8' : '#2563eb',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: submitting ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}
        >
          <span>{submitting ? '⏳' : '⭐'}</span>
          <span>
            {submitting
              ? 'Đang gửi đánh giá...'
              : isEditMode
                ? 'Cập nhật đánh giá'
                : 'Gửi đánh giá'}
          </span>
        </button>
      </div>
    </form>
  );
};

export default ProductReviewForm;

