import api from './api.js';
import { ORDER_STATUS } from '../utils/constants.js';

export const MAX_REVIEW_COMMENT_LENGTH = 2000;
export const MIN_REVIEW_RATING = 1;
export const MAX_REVIEW_RATING = 5;

export const STAR_RATING_LABELS = {
  1: 'Rất không hài lòng',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng / Tuyệt vời'
};

export const REVIEW_SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Mới nhất' },
  { value: 'createdAt,asc', label: 'Cũ nhất' },
  { value: 'rating,desc', label: 'Số sao cao nhất (5 → 1★)' },
  { value: 'rating,asc', label: 'Số sao thấp nhất (1 → 5★)' }
];

export const REVIEW_MODERATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  HIDDEN: 'HIDDEN'
};

export const MAX_HIDDEN_REASON_LENGTH = 255;

export const VIOLATION_REASON_PRESETS = [
  'Nội dung xúc phạm, thô tục',
  'Spam hoặc quảng cáo',
  'Nội dung không liên quan sản phẩm',
  'Chứa thông tin cá nhân nhạy cảm',
  'Đánh giá giả mạo hoặc gian lận',
  'Vi phạm chính sách hệ thống'
];

const REVIEW_SYNC_EVENT = 'shopmart:review-moderation-sync';
const REVIEW_SYNC_CHANNEL = 'shopmart_review_moderation_channel';

/**
 * Phát tín hiệu đồng bộ khi Admin duyệt / ẩn / hiện lại đánh giá
 * để trang Chi tiết sản phẩm của khách hàng cập nhật tức thì.
 */
export const notifyReviewModerationSync = (payload = {}) => {
  const detail = {
    ...payload,
    timestamp: Date.now()
  };

  try {
    if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(REVIEW_SYNC_EVENT, { detail }));
    }
  } catch {
    // Bỏ qua trên môi trường Node test
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(REVIEW_SYNC_CHANNEL);
      bc.postMessage(detail);
      bc.close();
    }
  } catch {
    // Bỏ qua nếu trình duyệt không hỗ trợ BroadcastChannel
  }
};

/**
 * Lắng nghe sự kiện Admin kiểm duyệt đánh giá để đồng bộ giao diện khách hàng.
 */
export const subscribeReviewModerationSync = (callback, productIdFilter = null) => {
  if (typeof callback !== 'function') return () => {};

  const shouldTrigger = (detail) => {
    if (!productIdFilter) return true;
    if (!detail || detail.productId === undefined || detail.productId === null) return true;
    return String(detail.productId) === String(productIdFilter);
  };

  const handleWindowEvent = (e) => {
    if (shouldTrigger(e?.detail)) {
      callback(e?.detail);
    }
  };

  let bc = null;
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener(REVIEW_SYNC_EVENT, handleWindowEvent);
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(REVIEW_SYNC_CHANNEL);
      bc.onmessage = (msg) => {
        if (shouldTrigger(msg?.data)) {
          callback(msg?.data);
        }
      };
    }
  } catch {
    bc = null;
  }

  return () => {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener(REVIEW_SYNC_EVENT, handleWindowEvent);
    }
    if (bc) {
      try {
        bc.close();
      } catch {
        // Ignore
      }
    }
  };
};

/**
 * Kiểm tra trạng thái đơn hàng có đủ điều kiện hoàn thành/đã giao để đánh giá hay không.
 * Theo Backend ReviewServiceImpl.fetchAndValidateOrder:
 * Đơn hàng phải ở trạng thái DELIVERED (trong Frontend constants.js: ORDER_STATUS.COMPLETED === 'DELIVERED').
 */
export const isOrderCompletedForReview = (status) => {
  if (!status) return false;
  const normalized = String(status).trim().toUpperCase();
  return normalized === ORDER_STATUS.DELIVERED || normalized === 'COMPLETED';
};

/**
 * Kiểm tra một đơn hàng có chứa sản phẩm productId hay không.
 */
export const orderContainsProduct = (order, productId) => {
  if (!order || !Array.isArray(order.items) || productId === undefined || productId === null) {
    return false;
  }
  const targetId = String(productId).trim();
  return order.items.some((item) => {
    const itemProdId = item?.productId ?? item?.product?.id ?? item?.id;
    return itemProdId !== undefined && itemProdId !== null && String(itemProdId).trim() === targetId;
  });
};

/**
 * Kiểm tra điều kiện đánh giá sản phẩm sau mua:
 * 1. Người dùng phải đăng nhập.
 * 2. Không phải tài khoản Admin (chỉ khách hàng mua hàng).
 * 3. Nếu đã đánh giá trước đó -> trả về trạng thái ALREADY_REVIEWED kèm đánh giá hiện có.
 * 4. Phải có đơn hàng thuộc về người dùng chứa sản phẩm đó.
 * 5. Đơn hàng chứa sản phẩm phải ở trạng thái DELIVERED (Đã giao thành công / Hoàn thành).
 */
export const evaluateReviewEligibility = ({
  isAuthenticated = false,
  user = null,
  orders = [],
  productId = null,
  existingReview = null
} = {}) => {
  if (!isAuthenticated || !user) {
    return {
      canReview: false,
      canEdit: false,
      reason: 'NOT_LOGGED_IN',
      eligibleOrders: [],
      defaultOrder: null,
      message: 'Vui lòng đăng nhập tài khoản để gửi đánh giá sản phẩm.'
    };
  }

  if (existingReview && existingReview.id) {
    return {
      canReview: false,
      canEdit: true,
      reason: 'ALREADY_REVIEWED',
      existingReview,
      eligibleOrders: [],
      defaultOrder: null,
      message: 'Bạn đã đánh giá sản phẩm này. Bạn có thể xem hoặc chỉnh sửa đánh giá của mình.'
    };
  }

  const safeOrders = Array.isArray(orders) ? orders : [];
  const currentUserId = user.userId ?? user.id ?? null;

  // Chỉ lấy đơn hàng thuộc về chính người dùng hiện tại và có chứa sản phẩm
  const matchingOrders = safeOrders.filter((order) => {
    if (!order) return false;
    if (
      currentUserId !== null &&
      currentUserId !== undefined &&
      order.userId !== null &&
      order.userId !== undefined &&
      String(order.userId) !== String(currentUserId)
    ) {
      return false;
    }
    return orderContainsProduct(order, productId);
  });

  if (matchingOrders.length === 0) {
    return {
      canReview: false,
      canEdit: false,
      reason: 'NOT_PURCHASED',
      eligibleOrders: [],
      defaultOrder: null,
      message: 'Chỉ khách hàng đã đặt mua sản phẩm này mới có thể gửi đánh giá.'
    };
  }

  const completedOrders = matchingOrders.filter((order) => isOrderCompletedForReview(order.status));

  if (completedOrders.length === 0) {
    const latestOrder = matchingOrders[0];
    return {
      canReview: false,
      canEdit: false,
      reason: 'ORDER_NOT_COMPLETED',
      pendingOrder: latestOrder,
      eligibleOrders: [],
      defaultOrder: null,
      message: `Đơn hàng #${latestOrder.id} chứa sản phẩm này hiện ở trạng thái "${latestOrder.status}". Bạn chỉ có thể đánh giá sau khi đơn hàng đã giao thành công (DELIVERED).`
    };
  }

  return {
    canReview: true,
    canEdit: false,
    reason: 'ELIGIBLE',
    eligibleOrders: completedOrders,
    defaultOrder: completedOrders[0],
    message: `Bạn đủ điều kiện đánh giá sản phẩm từ đơn hàng #${completedOrders[0].id}.`
  };
};

/**
 * Kiểm tra điều kiện hiển thị nút "Đánh giá sản phẩm" cho từng sản phẩm trong một đơn hàng cụ thể
 * tại trang Lịch sử mua hàng (Orders.jsx / OrderItem.jsx) và Chi tiết đơn hàng (OrderDetail.jsx):
 * 1. Người dùng phải đăng nhập (isAuthenticated && user).
 * 2. Đơn hàng phải tồn tại và có trạng thái đã giao thành công (DELIVERED / COMPLETED).
 *    - Nếu đơn đang chờ xác nhận (PENDING/CONFIRMED/PAID/PROCESSING), đang vận chuyển (SHIPPING),
 *      đã hủy (CANCELLED) hoặc thất bại (FAILED) -> KHÔNG hiển thị nút đánh giá.
 * 3. Sản phẩm phải thuộc đơn hàng đó (orderContainsProduct(order, productId)).
 * 4. Nếu đang kiểm tra trạng thái đánh giá từ API (checkingReviews === true) -> Hiển thị loading, KHÔNG hiển thị nút đánh giá sớm.
 * 5. Nếu API kiểm tra trạng thái đánh giá bị lỗi (reviewCheckError) -> Hiển thị lỗi/thử lại, KHÔNG hiển thị nút sai điều kiện.
 * 6. Nếu sản phẩm đã được người dùng đánh giá (existingReview?.id) -> Ẩn nút đánh giá, hiển thị trạng thái "Đã đánh giá", chặn đánh giá lần 2.
 * 7. Chỉ khi thỏa mãn toàn bộ điều kiện trên -> canShowReviewButton = true.
 */
export const evaluateOrderItemReviewEligibility = ({
  isAuthenticated = false,
  user = null,
  order = null,
  productId = null,
  existingReview = null,
  checkingReviews = false,
  reviewCheckError = ''
} = {}) => {
  if (!isAuthenticated || !user) {
    return {
      canShowReviewButton: false,
      canOpenReviewForm: false,
      isReviewed: false,
      isLoading: false,
      isError: false,
      reason: 'NOT_LOGGED_IN'
    };
  }

  if (!order || !isOrderCompletedForReview(order.status)) {
    return {
      canShowReviewButton: false,
      canOpenReviewForm: false,
      isReviewed: false,
      isLoading: false,
      isError: false,
      reason: 'ORDER_NOT_DELIVERED'
    };
  }

  const currentUserId = user.userId ?? user.id ?? null;
  if (
    currentUserId !== null &&
    currentUserId !== undefined &&
    order.userId !== null &&
    order.userId !== undefined &&
    String(order.userId) !== String(currentUserId)
  ) {
    return {
      canShowReviewButton: false,
      canOpenReviewForm: false,
      isReviewed: false,
      isLoading: false,
      isError: false,
      reason: 'ORDER_NOT_OWNED'
    };
  }

  if (productId === undefined || productId === null || !orderContainsProduct(order, productId)) {
    return {
      canShowReviewButton: false,
      canOpenReviewForm: false,
      isReviewed: false,
      isLoading: false,
      isError: false,
      reason: 'PRODUCT_NOT_IN_ORDER'
    };
  }

  if (checkingReviews) {
    return {
      canShowReviewButton: false,
      canOpenReviewForm: false,
      isReviewed: false,
      isLoading: true,
      isError: false,
      reason: 'CHECKING_REVIEW_STATUS'
    };
  }

  if (reviewCheckError) {
    return {
      canShowReviewButton: false,
      canOpenReviewForm: false,
      isReviewed: false,
      isLoading: false,
      isError: true,
      reason: 'REVIEW_STATUS_API_ERROR',
      errorMessage: reviewCheckError
    };
  }

  if (existingReview && existingReview.id) {
    return {
      canShowReviewButton: false,
      canOpenReviewForm: false,
      isReviewed: true,
      isLoading: false,
      isError: false,
      existingReview,
      reason: 'ALREADY_REVIEWED'
    };
  }

  return {
    canShowReviewButton: true,
    canOpenReviewForm: true,
    isReviewed: false,
    isLoading: false,
    isError: false,
    reason: 'ELIGIBLE'
  };
};

/**
 * Kiểm tra tính hợp lệ của dữ liệu Form đánh giá trước khi gửi API.
 */
export const validateReviewInput = ({ rating, comment, orderId, requireOrderId = true } = {}) => {
  const errors = {};

  if (requireOrderId && (orderId === undefined || orderId === null || String(orderId).trim() === '')) {
    errors.orderId = 'Không xác định được đơn hàng hợp lệ để đánh giá.';
  }

  const numRating = Number(rating);
  if (!rating || Number.isNaN(numRating) || numRating < MIN_REVIEW_RATING || numRating > MAX_REVIEW_RATING) {
    errors.rating = 'Vui lòng chọn số sao đánh giá từ 1 đến 5 sao.';
  }

  const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
  if (!trimmedComment) {
    errors.comment = 'Vui lòng nhập nội dung nhận xét đánh giá sản phẩm (không được để trống).';
  } else if (trimmedComment.length > MAX_REVIEW_COMMENT_LENGTH) {
    errors.comment = `Nội dung đánh giá không được vượt quá ${MAX_REVIEW_COMMENT_LENGTH} ký tự.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      orderId: orderId !== undefined && orderId !== null && String(orderId).trim() !== '' ? Number(orderId) : undefined,
      rating: numRating,
      comment: trimmedComment
    }
  };
};

/**
 * Chuẩn hóa đối tượng ReviewResponse từ Backend
 */
export const normalizeReview = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id,
    productId: raw.productId,
    userId: raw.userId,
    orderId: raw.orderId ?? null,
    userFullName: raw.userFullName || raw.fullName || raw.userName || raw.reviewerName || null,
    userAvatarUrl: raw.userAvatarUrl || raw.avatarUrl || null,
    verifiedPurchase:
      raw.verifiedPurchase !== undefined
        ? Boolean(raw.verifiedPurchase)
        : Boolean(raw.orderId !== undefined && raw.orderId !== null),
    rating: Number(raw.rating ?? 0),
    comment: raw.comment ?? '',
    status: raw.status || 'APPROVED',
    hiddenReason: raw.hiddenReason || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  };
};

/**
 * Tính toán phân bổ số lượng và tỷ lệ phần trăm từng mức sao (1 - 5 sao) từ dữ liệu thật.
 * Không sinh số liệu giả khi chưa có đánh giá.
 */
export const calculateStarDistribution = (reviews = [], backendDistribution = null, totalReviewsOverride = null) => {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (backendDistribution && typeof backendDistribution === 'object') {
    [5, 4, 3, 2, 1].forEach((star) => {
      const val = Number(backendDistribution[star] ?? backendDistribution[String(star)] ?? 0);
      counts[star] = Number.isNaN(val) || val < 0 ? 0 : val;
    });
  } else if (Array.isArray(reviews)) {
    reviews.forEach((rev) => {
      const r = Math.round(Number(rev?.rating) || 0);
      if (r >= 1 && r <= 5) {
        counts[r] += 1;
      }
    });
  }

  const sumCounts = counts[5] + counts[4] + counts[3] + counts[2] + counts[1];
  const denominator =
    totalReviewsOverride !== null && totalReviewsOverride !== undefined && Number(totalReviewsOverride) > 0
      ? Math.max(Number(totalReviewsOverride), sumCounts)
      : sumCounts;

  const percentages = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (denominator > 0) {
    [5, 4, 3, 2, 1].forEach((star) => {
      percentages[star] = Math.min(100, Math.round((counts[star] / denominator) * 100));
    });
  }

  return {
    counts,
    percentages,
    totalCounted: sumCounts
  };
};

/**
 * Lọc và sắp xếp danh sách đánh giá theo số sao (1-5) và tiêu chí sắp xếp.
 */
export const filterAndSortReviews = (reviews = [], { starFilter = 0, sortBy = 'createdAt,desc' } = {}) => {
  if (!Array.isArray(reviews)) return [];

  const targetStar = Number(starFilter) || 0;
  const filtered =
    targetStar >= 1 && targetStar <= 5
      ? reviews.filter((item) => Math.round(Number(item?.rating) || 0) === targetStar)
      : [...reviews];

  const [field, direction] = String(sortBy || 'createdAt,desc').split(',');
  const isAsc = String(direction || 'desc').toLowerCase() === 'asc';

  filtered.sort((a, b) => {
    if (field === 'rating') {
      const diff = (Number(a?.rating) || 0) - (Number(b?.rating) || 0);
      if (diff !== 0) return isAsc ? diff : -diff;
    }
    const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    const safeTimeA = Number.isNaN(timeA) ? 0 : timeA;
    const safeTimeB = Number.isNaN(timeB) ? 0 : timeB;
    if (safeTimeA !== safeTimeB) {
      return isAsc ? safeTimeA - safeTimeB : safeTimeB - safeTimeA;
    }
    return isAsc ? (Number(a?.id) || 0) - (Number(b?.id) || 0) : (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });

  return filtered;
};

/**
 * Chuẩn hóa đối tượng ReviewSummaryResponse từ Backend GET /api/v1/products/{productId}/reviews
 */
export const normalizeReviewSummary = (payload, productId, params = {}) => {
  const defaultPage = Number(params?.page ?? 0);
  const defaultSize = Number(params?.size ?? 10);

  if (!payload || typeof payload !== 'object') {
    return {
      productId: Number(productId) || productId,
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviews: {
        content: [],
        pageNumber: defaultPage,
        pageSize: defaultSize,
        totalElements: 0,
        totalPages: 0,
        last: true
      }
    };
  }

  const reviewsBlock = payload.reviews || {};
  const rawList = Array.isArray(reviewsBlock.content)
    ? reviewsBlock.content
    : Array.isArray(payload.content)
      ? payload.content
      : [];

  const allNormalized = rawList.map(normalizeReview).filter(Boolean);
  // Chỉ hiển thị công khai các đánh giá có trạng thái APPROVED (ẩn tuyệt đối HIDDEN và PENDING)
  const content = allNormalized.filter(
    (item) => !item.status || String(item.status).toUpperCase() === REVIEW_MODERATION_STATUS.APPROVED
  );
  const totalReviews = Number(payload.totalReviews ?? reviewsBlock.totalElements ?? content.length);
  const averageRating = Number(payload.averageRating ?? 0);
  const backendDist = payload.ratingDistribution || payload.starCounts || payload.ratingCounts || null;
  const { counts: ratingDistribution } = calculateStarDistribution(content, backendDist, totalReviews);

  return {
    productId: payload.productId ?? (Number(productId) || productId),
    averageRating: Number.isNaN(averageRating) ? 0 : Math.round(averageRating * 10) / 10,
    totalReviews: Number.isNaN(totalReviews) ? 0 : totalReviews,
    ratingDistribution,
    hasBackendDistribution: Boolean(backendDist),
    reviews: {
      content,
      pageNumber: Number(reviewsBlock.pageNumber ?? defaultPage),
      pageSize: Number(reviewsBlock.pageSize ?? defaultSize),
      totalElements: Number(reviewsBlock.totalElements ?? totalReviews),
      totalPages: Number(reviewsBlock.totalPages ?? (totalReviews > 0 ? Math.ceil(totalReviews / defaultSize) : 0)),
      last: Boolean(reviewsBlock.last ?? true)
    }
  };
};

/**
 * Chuẩn hóa dữ liệu phân trang PagedResponse<ReviewResponse> dành cho Admin từ GET /api/v1/admin/reviews
 */
export const normalizeAdminReviewsPage = (payload, params = {}) => {
  const defaultPage = Number(params?.page ?? 0);
  const defaultSize = Number(params?.size ?? 20);

  if (!payload) {
    return {
      content: [],
      pageNumber: defaultPage,
      pageSize: defaultSize,
      totalElements: 0,
      totalPages: 0,
      last: true
    };
  }

  const rawList = Array.isArray(payload.content)
    ? payload.content
    : Array.isArray(payload)
      ? payload
      : [];

  const content = rawList.map(normalizeReview).filter(Boolean);
  const totalElements = Number(payload.totalElements ?? content.length);
  const totalPages = Number(
    payload.totalPages ?? (totalElements > 0 ? Math.ceil(totalElements / defaultSize) : 0)
  );

  return {
    content,
    pageNumber: Number(payload.pageNumber ?? defaultPage),
    pageSize: Number(payload.pageSize ?? defaultSize),
    totalElements: Number.isNaN(totalElements) ? content.length : totalElements,
    totalPages: Number.isNaN(totalPages) ? 1 : totalPages,
    last: Boolean(payload.last ?? true)
  };
};

/**
 * Tính toán các chỉ số thống kê KPI đánh giá dành cho Admin từ danh sách dữ liệu thực tế của API:
 * - Tổng số đánh giá (totalReviews)
 * - Đánh giá chờ duyệt (pendingReviews)
 * - Đánh giá đã duyệt (approvedReviews)
 * - Đánh giá đã ẩn (hiddenReviews)
 * - Điểm đánh giá trung bình (averageRating)
 */
export const calculateAdminReviewStats = (reviews = []) => {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      totalReviews: 0,
      pendingReviews: 0,
      approvedReviews: 0,
      hiddenReviews: 0,
      averageRating: 0
    };
  }

  let pendingReviews = 0;
  let approvedReviews = 0;
  let hiddenReviews = 0;
  let ratingSum = 0;
  let validRatingCount = 0;

  reviews.forEach((rev) => {
    if (!rev) return;
    const status = String(rev.status || 'APPROVED').toUpperCase();
    if (status === REVIEW_MODERATION_STATUS.PENDING) {
      pendingReviews += 1;
    } else if (status === REVIEW_MODERATION_STATUS.HIDDEN) {
      hiddenReviews += 1;
    } else {
      approvedReviews += 1;
    }

    const r = Number(rev.rating);
    if (!Number.isNaN(r) && r >= 1 && r <= 5) {
      ratingSum += r;
      validRatingCount += 1;
    }
  });

  const averageRating =
    validRatingCount > 0 ? Math.round((ratingSum / validRatingCount) * 10) / 10 : 0;

  return {
    totalReviews: reviews.length,
    pendingReviews,
    approvedReviews,
    hiddenReviews,
    averageRating
  };
};

/**
 * Lọc và sắp xếp danh sách đánh giá cho Admin theo:
 * - Tên sản phẩm (productSearch) / Tên khách hàng (customerSearch) / Từ khóa chung (searchTerm)
 * - Số sao (ratingFilter: 0 | 1..5)
 * - Trạng thái kiểm duyệt (statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'HIDDEN')
 * - Khoảng thời gian (startDate, endDate định dạng YYYY-MM-DD)
 * - Sắp xếp (sortBy: 'createdAt,desc' | 'createdAt,asc' | 'rating,desc' | 'rating,asc')
 */
export const filterAdminReviews = (
  reviews = [],
  {
    searchTerm = '',
    productQuery = '',
    customerQuery = '',
    ratingFilter = 0,
    statusFilter = 'ALL',
    startDate = '',
    endDate = '',
    sortBy = 'createdAt,desc'
  } = {}
) => {
  if (!Array.isArray(reviews)) return [];

  const term = String(searchTerm || '').trim().toLowerCase();
  const prodTerm = String(productQuery || '').trim().toLowerCase();
  const custTerm = String(customerQuery || '').trim().toLowerCase();
  const targetRating = Number(ratingFilter) || 0;
  const targetStatus = String(statusFilter || 'ALL').trim().toUpperCase();

  const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

  const filtered = reviews.filter((rev) => {
    if (!rev) return false;

    // 1. Lọc theo trạng thái kiểm duyệt
    if (targetStatus !== 'ALL') {
      const revStatus = String(rev.status || 'APPROVED').toUpperCase();
      if (revStatus !== targetStatus) return false;
    }

    // 2. Lọc theo số sao (1..5)
    if (targetRating >= 1 && targetRating <= 5) {
      if (Math.round(Number(rev.rating) || 0) !== targetRating) return false;
    }

    // 3. Lọc theo khoảng thời gian
    if ((startMs && !Number.isNaN(startMs)) || (endMs && !Number.isNaN(endMs))) {
      if (!rev.createdAt) return false;
      const revMs = new Date(rev.createdAt).getTime();
      if (Number.isNaN(revMs)) return false;
      if (startMs && !Number.isNaN(startMs) && revMs < startMs) return false;
      if (endMs && !Number.isNaN(endMs) && revMs > endMs) return false;
    }

    const productNameStr = String(
      rev.productName || rev.product?.name || `Sản phẩm #${rev.productId}`
    ).toLowerCase();
    const customerNameStr = String(
      rev.customerName || rev.userFullName || `Khách hàng #${rev.userId}`
    ).toLowerCase();
    const customerEmailStr = String(rev.customerEmail || '').toLowerCase();
    const commentStr = String(rev.comment || '').toLowerCase();
    const idStr = String(rev.id || '').toLowerCase();
    const productIdStr = String(rev.productId || '').toLowerCase();
    const userIdStr = String(rev.userId || '').toLowerCase();

    // 4. Tìm kiếm riêng theo tên sản phẩm (nếu nhập)
    if (prodTerm) {
      if (!productNameStr.includes(prodTerm) && !productIdStr.includes(prodTerm)) {
        return false;
      }
    }

    // 5. Tìm kiếm riêng theo tên khách hàng (nếu nhập)
    if (custTerm) {
      if (
        !customerNameStr.includes(custTerm) &&
        !customerEmailStr.includes(custTerm) &&
        !userIdStr.includes(custTerm)
      ) {
        return false;
      }
    }

    // 6. Tìm kiếm tổng hợp (tên sản phẩm, tên khách hàng, ID đánh giá, bình luận)
    if (term) {
      const matched =
        productNameStr.includes(term) ||
        customerNameStr.includes(term) ||
        customerEmailStr.includes(term) ||
        commentStr.includes(term) ||
        idStr.includes(term) ||
        productIdStr.includes(term) ||
        userIdStr.includes(term);
      if (!matched) return false;
    }

    return true;
  });

  // 7. Sắp xếp
  return filterAndSortReviews(filtered, { starFilter: 0, sortBy });
};

export const reviewService = {
  /**
   * Xem danh sách đánh giá công khai của sản phẩm kèm điểm trung bình & tổng số đánh giá (Public)
   * Endpoint: GET /api/v1/products/{productId}/reviews
   */
  getProductReviews: async (productId, params = { page: 0, size: 10 }) => {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 10,
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.rating ? { rating: params.rating } : {})
    };
    const response = await api.get(`/products/${productId}/reviews`, { params: queryParams });
    return normalizeReviewSummary(response, productId, queryParams);
  },

  /**
   * Lấy đánh giá của chính người dùng hiện tại cho sản phẩm (Yêu cầu đăng nhập JWT)
   * Endpoint: GET /api/v1/products/{productId}/reviews/me
   */
  getMyReview: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}/reviews/me`);
      return normalizeReview(response);
    } catch (err) {
      // Nếu Backend trả về 404 (chưa có đánh giá), trả về null an toàn
      if (err?.status === 404 || err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Lấy danh sách đơn hàng thật của người dùng từ Backend API để kiểm tra điều kiện mua hàng
   * Endpoint: GET /api/v1/orders/my-orders (Không dùng mock data)
   */
  getMyRealOrders: async () => {
    const response = await api.get('/orders/my-orders');
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray(response.content)) {
      return response.content;
    }
    return [];
  },

  /**
   * Tạo đánh giá mới cho sản phẩm sau khi mua (Yêu cầu đăng nhập JWT & đơn hàng DELIVERED)
   * Endpoint: POST /api/v1/products/{productId}/reviews
   * Request body: { orderId, rating, comment }
   */
  createReview: async (productId, { orderId, rating, comment }) => {
    const validation = validateReviewInput({ rating, comment, orderId, requireOrderId: true });
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      const err = new Error(firstError);
      err.validationErrors = validation.errors;
      throw err;
    }

    const response = await api.post(`/products/${productId}/reviews`, {
      orderId: validation.sanitized.orderId,
      rating: validation.sanitized.rating,
      comment: validation.sanitized.comment
    });
    return normalizeReview(response);
  },

  /**
   * Cập nhật đánh giá hiện có của người dùng (Owner)
   * Endpoint: PUT /api/v1/products/{productId}/reviews/{reviewId}
   * Request body: { rating, comment }
   */
  updateReview: async (productId, reviewId, { rating, comment }) => {
    const validation = validateReviewInput({ rating, comment, requireOrderId: false });
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      const err = new Error(firstError);
      err.validationErrors = validation.errors;
      throw err;
    }

    const response = await api.put(`/products/${productId}/reviews/${reviewId}`, {
      rating: validation.sanitized.rating,
      comment: validation.sanitized.comment
    });
    return normalizeReview(response);
  },

  /**
   * Xóa đánh giá của người dùng (Owner hoặc Admin)
   * Endpoint: DELETE /api/v1/products/{productId}/reviews/{reviewId}
   */
  deleteReview: async (productId, reviewId) => {
    const res = await api.delete(`/products/${productId}/reviews/${reviewId}`);
    notifyReviewModerationSync({ reviewId, productId, action: 'DELETED' });
    return res;
  },

  /**
   * [ADMIN] Lấy danh sách toàn bộ đánh giá hệ thống để kiểm duyệt
   * Endpoint: GET /api/v1/admin/reviews
   * Query params: page, size, sort, status (APPROVED | HIDDEN)
   */
  getAdminReviews: async (params = { page: 0, size: 100, sort: 'createdAt,desc' }) => {
    const normalizedStatus = params.status ? String(params.status).trim().toUpperCase() : null;
    // Backend ReviewStatus enum hỗ trợ APPROVED và HIDDEN
    const backendSupportedStatus =
      normalizedStatus === REVIEW_MODERATION_STATUS.APPROVED ||
      normalizedStatus === REVIEW_MODERATION_STATUS.HIDDEN
        ? normalizedStatus
        : undefined;

    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 100,
      sort: params.sort || 'createdAt,desc',
      ...(backendSupportedStatus ? { status: backendSupportedStatus } : {})
    };

    const response = await api.get('/admin/reviews', { params: queryParams });
    return normalizeAdminReviewsPage(response, queryParams);
  },

  /**
   * [ADMIN] Kiểm duyệt đánh giá: Duyệt (APPROVED), Ẩn đánh giá vi phạm (HIDDEN) hoặc Hiện lại (APPROVED)
   * Endpoint chính: PATCH /api/v1/admin/reviews/{reviewId}/moderate
   * Endpoint alias trên Backend: PUT /api/v1/admin/reviews/{reviewId}/status
   * Request body: { status: 'APPROVED' | 'HIDDEN', reason?: string (max 255) }
   */
  moderateAdminReview: async (reviewId, { status, reason = null } = {}) => {
    if (reviewId === undefined || reviewId === null || String(reviewId).trim() === '') {
      throw new Error('Mã đánh giá (reviewId) không hợp lệ.');
    }

    const targetStatus = String(status || '').trim().toUpperCase();
    if (
      targetStatus !== REVIEW_MODERATION_STATUS.APPROVED &&
      targetStatus !== REVIEW_MODERATION_STATUS.HIDDEN
    ) {
      throw new Error('Trạng thái kiểm duyệt chỉ chấp nhận APPROVED (Đã duyệt) hoặc HIDDEN (Đã ẩn).');
    }

    const trimmedReason =
      targetStatus === REVIEW_MODERATION_STATUS.HIDDEN && typeof reason === 'string'
        ? reason.trim()
        : null;

    if (targetStatus === REVIEW_MODERATION_STATUS.HIDDEN && !trimmedReason) {
      throw new Error('Vui lòng chọn hoặc nhập lý do ẩn đánh giá vi phạm.');
    }

    if (trimmedReason && trimmedReason.length > MAX_HIDDEN_REASON_LENGTH) {
      throw new Error(`Lý do ẩn không được vượt quá ${MAX_HIDDEN_REASON_LENGTH} ký tự.`);
    }

    const payload = {
      status: targetStatus,
      reason: trimmedReason
    };

    let response;
    try {
      response = await api.patch(`/admin/reviews/${reviewId}/moderate`, payload);
    } catch (err) {
      const httpStatus = err?.status || err?.response?.status;
      // Nếu proxy/gateway chặn PATCH (405 Method Not Allowed), gọi sang alias PUT chính thức của Backend
      if (httpStatus === 405) {
        response = await api.put(`/admin/reviews/${reviewId}/status`, payload);
      } else {
        throw err;
      }
    }

    const normalized = normalizeReview(response);
    notifyReviewModerationSync({
      reviewId: normalized?.id ?? reviewId,
      productId: normalized?.productId,
      status: normalized?.status ?? targetStatus
    });
    return normalized;
  }
};

export default reviewService;
