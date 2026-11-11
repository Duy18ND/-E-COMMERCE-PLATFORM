import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateReviewEligibility,
  evaluateOrderItemReviewEligibility,
  validateReviewInput,
  normalizeReviewSummary,
  normalizeReview,
  normalizeAdminReviewsPage,
  calculateStarDistribution,
  calculateAdminReviewStats,
  filterAndSortReviews,
  filterAdminReviews,
  isOrderCompletedForReview,
  REVIEW_MODERATION_STATUS,
  VIOLATION_REASON_PRESETS,
  MAX_REVIEW_COMMENT_LENGTH
} from '../src/services/reviewService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const readSrc = (relPath) => fs.readFileSync(path.join(rootDir, 'src', relPath), 'utf8');

test('ECOM-177 FE QA SUITE: FORM ĐÁNH GIÁ SAO VÀ NỘI DUNG SAU MUA', async (t) => {
  const reviewServiceSrc = readSrc('services/reviewService.js');
  const reviewFormSrc = readSrc('components/product/ProductReviewForm.jsx');
  const reviewsSectionSrc = readSrc('components/product/ProductReviewsSection.jsx');
  const productDetailSrc = readSrc('pages/customer/ProductDetail.jsx');
  const orderDetailSrc = readSrc('pages/customer/OrderDetail.jsx');
  const ordersHistorySrc = readSrc('pages/customer/Orders.jsx');
  const orderItemSrc = readSrc('components/order/OrderItem.jsx');
  const orderServiceSrc = readSrc('services/orderService.js');
  const adminReviewsSrc = readSrc('pages/admin/AdminReviews.jsx');
  const appRoutesSrc = readSrc('routes/AppRoutes.jsx');
  const adminSidebarSrc = readSrc('components/admin/AdminSidebar.jsx');
  const adminHeaderSrc = readSrc('components/admin/AdminHeader.jsx');

  await t.test('TC-REV-01: Người dùng chưa đăng nhập bị chặn đánh giá (NOT_LOGGED_IN)', () => {
    const result = evaluateReviewEligibility({
      isAuthenticated: false,
      user: null,
      orders: [],
      productId: 101,
      existingReview: null
    });
    assert.equal(result.canReview, false);
    assert.equal(result.reason, 'NOT_LOGGED_IN');
    assert.match(reviewsSectionSrc, /data-testid="review-not-logged-in"/);
    assert.match(reviewsSectionSrc, /Bạn cần đăng nhập để gửi đánh giá sản phẩm/);
  });

  await t.test('TC-REV-02: Người dùng chưa mua sản phẩm hoặc sản phẩm không thuộc đơn hàng của người dùng (NOT_PURCHASED)', () => {
    // 1. Chưa có đơn hàng nào
    const resEmpty = evaluateReviewEligibility({
      isAuthenticated: true,
      user: { id: 10, email: 'customer@shopmart.vn' },
      orders: [],
      productId: 101,
      existingReview: null
    });
    assert.equal(resEmpty.canReview, false);
    assert.equal(resEmpty.reason, 'NOT_PURCHASED');

    // 2. Có đơn hàng DELIVERED nhưng chứa sản phẩm khác (productId = 999 != 101)
    const resOtherProduct = evaluateReviewEligibility({
      isAuthenticated: true,
      user: { id: 10, email: 'customer@shopmart.vn' },
      orders: [
        {
          id: 5001,
          userId: 10,
          status: 'DELIVERED',
          items: [{ productId: 999, name: 'Sản phẩm khác' }]
        }
      ],
      productId: 101,
      existingReview: null
    });
    assert.equal(resOtherProduct.canReview, false);
    assert.equal(resOtherProduct.reason, 'NOT_PURCHASED');

    // 3. Đơn hàng chứa sản phẩm nhưng thuộc userId khác (chống IDOR)
    const resOtherUserOrder = evaluateReviewEligibility({
      isAuthenticated: true,
      user: { id: 10, email: 'customer@shopmart.vn' },
      orders: [
        {
          id: 5002,
          userId: 99,
          status: 'DELIVERED',
          items: [{ productId: 101, name: 'MacBook Pro 14' }]
        }
      ],
      productId: 101,
      existingReview: null
    });
    assert.equal(resOtherUserOrder.canReview, false);
    assert.equal(resOtherUserOrder.reason, 'NOT_PURCHASED');
    assert.match(reviewsSectionSrc, /data-testid="review-not-purchased"/);
  });

  await t.test('TC-REV-03: Đơn hàng chưa hoàn thành (PENDING, PAID, CONFIRMED, PROCESSING, SHIPPING, CANCELLED) không được đánh giá', () => {
    const incompleteStatuses = ['PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'CANCELLED', 'FAILED'];
    for (const st of incompleteStatuses) {
      assert.equal(isOrderCompletedForReview(st), false, `Trạng thái ${st} không được tính là hoàn thành`);
      const res = evaluateReviewEligibility({
        isAuthenticated: true,
        user: { id: 10 },
        orders: [
          {
            id: 6001,
            userId: 10,
            status: st,
            items: [{ productId: 101 }]
          }
        ],
        productId: 101,
        existingReview: null
      });
      assert.equal(res.canReview, false);
      assert.equal(res.reason, 'ORDER_NOT_COMPLETED');
      assert.equal(res.pendingOrder.id, 6001);
    }
    assert.match(reviewsSectionSrc, /data-testid="review-order-not-completed"/);
  });

  await t.test('TC-REV-04: Kiểm tra đánh giá thiếu số sao hoặc số sao ngoài khoảng 1..5', () => {
    const noStar = validateReviewInput({ rating: 0, comment: 'Sản phẩm rất tốt', orderId: 7001 });
    assert.equal(noStar.isValid, false);
    assert.ok(noStar.errors.rating, 'Phải báo lỗi khi chưa chọn số sao');

    const overStar = validateReviewInput({ rating: 6, comment: 'Sản phẩm rất tốt', orderId: 7001 });
    assert.equal(overStar.isValid, false);
    assert.ok(overStar.errors.rating, 'Phải báo lỗi khi số sao > 5');

    assert.match(reviewFormSrc, /\[1, 2, 3, 4, 5\]\.map/);
    assert.match(reviewFormSrc, /onMouseEnter=/);
    assert.match(reviewFormSrc, /data-testid="selected-rating-badge"/);
  });

  await t.test('TC-REV-05: Kiểm tra nội dung đánh giá trống, chỉ chứa khoảng trắng hoặc vượt quá giới hạn ký tự', () => {
    const emptyComment = validateReviewInput({ rating: 5, comment: '    ', orderId: 7001 });
    assert.equal(emptyComment.isValid, false);
    assert.ok(emptyComment.errors.comment, 'Phải báo lỗi khi nội dung đánh giá trống');

    const tooLongComment = validateReviewInput({
      rating: 5,
      comment: 'a'.repeat(MAX_REVIEW_COMMENT_LENGTH + 1),
      orderId: 7001
    });
    assert.equal(tooLongComment.isValid, false);
    assert.ok(tooLongComment.errors.comment, 'Phải báo lỗi khi vượt quá 2000 ký tự');

    assert.match(reviewFormSrc, /data-testid="review-comment-textarea"/);
    assert.match(reviewFormSrc, /data-testid="comment-char-counter"/);
    assert.match(reviewFormSrc, /maxLength=\{MAX_REVIEW_COMMENT_LENGTH\}/);
  });

  await t.test('TC-REV-06: Đánh giá hợp lệ khi đã mua đơn DELIVERED & nhập đủ số sao + nhận xét', () => {
    const eligibility = evaluateReviewEligibility({
      isAuthenticated: true,
      user: { id: 10 },
      orders: [
        {
          id: 8001,
          userId: 10,
          status: 'DELIVERED',
          items: [{ productId: 101, name: 'MacBook Pro 14 M3 Pro' }]
        }
      ],
      productId: 101,
      existingReview: null
    });
    assert.equal(eligibility.canReview, true);
    assert.equal(eligibility.reason, 'ELIGIBLE');
    assert.equal(eligibility.defaultOrder.id, 8001);

    const validInput = validateReviewInput({
      rating: 5,
      comment: '  Máy chạy rất mượt, pin trâu, giao hàng nhanh!  ',
      orderId: 8001
    });
    assert.equal(validInput.isValid, true);
    assert.deepEqual(validInput.sanitized, {
      orderId: 8001,
      rating: 5,
      comment: 'Máy chạy rất mượt, pin trâu, giao hàng nhanh!'
    });
  });

  await t.test('TC-REV-07: Gửi đánh giá thành công qua API POST /api/v1/products/{productId}/reviews & PUT /{reviewId}', () => {
    assert.match(reviewServiceSrc, /api\.post\(`\/products\/\$\{productId\}\/reviews`/);
    assert.match(reviewServiceSrc, /api\.put\(`\/products\/\$\{productId\}\/reviews\/\$\{reviewId\}`/);
    assert.match(reviewServiceSrc, /api\.delete\(`\/products\/\$\{productId\}\/reviews\/\$\{reviewId\}`/);
    assert.match(reviewFormSrc, /data-testid="submit-review-button"/);
    assert.match(reviewFormSrc, /data-testid="cancel-review-button"/);
    assert.match(reviewFormSrc, /data-testid="review-product-info"/);
    assert.match(reviewFormSrc, /data-testid="review-submit-success"/);
  });

  await t.test('TC-REV-08: Xử lý lỗi từ API Backend (400, 401, 403, 409, 500) và hiển thị thông báo rõ ràng', () => {
    assert.match(reviewFormSrc, /status === 409/);
    assert.match(reviewFormSrc, /status === 403/);
    assert.match(reviewFormSrc, /status === 401/);
    assert.match(reviewFormSrc, /data-testid="review-submit-error"/);
    assert.match(reviewsSectionSrc, /<ErrorMessage message=\{reviewsError\} \/>/);
    assert.match(reviewsSectionSrc, /Thử lại tải đánh giá/);
  });

  await t.test('TC-REV-09: Chặn người dùng gửi đánh giá trùng (ALREADY_REVIEWED) và cho phép chỉnh sửa đánh giá đã gửi', () => {
    const existing = normalizeReview({
      id: 55,
      productId: 101,
      userId: 10,
      orderId: 8001,
      rating: 5,
      comment: 'Đánh giá lần đầu',
      status: 'APPROVED'
    });

    const dupCheck = evaluateReviewEligibility({
      isAuthenticated: true,
      user: { id: 10 },
      orders: [{ id: 8001, userId: 10, status: 'DELIVERED', items: [{ productId: 101 }] }],
      productId: 101,
      existingReview: existing
    });

    assert.equal(dupCheck.canReview, false);
    assert.equal(dupCheck.canEdit, true);
    assert.equal(dupCheck.reason, 'ALREADY_REVIEWED');
    assert.match(reviewsSectionSrc, /data-testid="review-already-submitted"/);
    assert.match(reviewsSectionSrc, /data-testid="edit-my-review-button"/);
  });

  await t.test('TC-REV-10: Tải lại trang vẫn hiển thị đánh giá thật từ Backend API, hoàn toàn không dùng Mock Data hay localStorage', () => {
    assert.match(reviewServiceSrc, /api\.get\(`\/products\/\$\{productId\}\/reviews`/);
    assert.match(reviewServiceSrc, /api\.get\(`\/products\/\$\{productId\}\/reviews\/me`\)/);
    assert.doesNotMatch(reviewServiceSrc, /localStorage/);
    assert.doesNotMatch(reviewFormSrc, /localStorage/);
    assert.doesNotMatch(reviewsSectionSrc, /localStorage/);

    const normalizedSummary = normalizeReviewSummary(
      {
        productId: 101,
        averageRating: 4.666,
        totalReviews: 2,
        reviews: {
          content: [
            { id: 1, productId: 101, userId: 10, orderId: 8001, rating: 5, comment: 'Rất tốt' },
            { id: 2, productId: 101, userId: 12, orderId: 8005, rating: 4, comment: 'Ổn áp' }
          ],
          pageNumber: 0,
          pageSize: 5,
          totalElements: 2,
          totalPages: 1,
          last: true
        }
      },
      101
    );

    assert.equal(normalizedSummary.averageRating, 4.7);
    assert.equal(normalizedSummary.totalReviews, 2);
    assert.equal(normalizedSummary.reviews.content.length, 2);

    assert.match(productDetailSrc, /<ProductReviewsSection/);
    assert.match(orderDetailSrc, /<ProductReviewForm/);
  });

  await t.test('TC-REV-11: Trang Lịch sử mua hàng (Orders.jsx & OrderItem.jsx) hiển thị danh sách sản phẩm trong đơn và nút Đánh giá sản phẩm đúng điều kiện', () => {
    assert.match(orderItemSrc, /items\.map/);
    assert.match(orderItemSrc, /Đánh giá sản phẩm/);
    assert.match(orderItemSrc, /Đã đánh giá/);
    assert.match(orderItemSrc, /order-history-review-btn-/);
    assert.match(orderItemSrc, /order-history-reviewed-badge-/);
    assert.match(orderItemSrc, /order-history-review-loading-/);
    assert.match(orderItemSrc, /order-history-review-error-/);
    assert.match(orderItemSrc, /evaluateOrderItemReviewEligibility/);
    assert.match(orderItemSrc, /isOrderCompletedForReview\(order\.status\)/);
  });

  await t.test('TC-REV-12: Trang Lịch sử mua hàng mở Modal đánh giá và cập nhật ngay trạng thái Đã đánh giá không cần reload trang', () => {
    assert.match(ordersHistorySrc, /<ProductReviewForm/);
    assert.match(ordersHistorySrc, /data-testid="order-history-review-modal"/);
    assert.match(ordersHistorySrc, /reviewService\.getMyReview/);
    assert.match(ordersHistorySrc, /handleReviewSuccess/);
    assert.match(ordersHistorySrc, /setReviewsMap/);
    assert.match(ordersHistorySrc, /status === 401/);
    assert.doesNotMatch(ordersHistorySrc, /localStorage/);
    assert.match(orderServiceSrc, /api\.get\('\/orders\/my-orders'\)/);
  });

  await t.test('TC-REV-13: Khu vực tổng quan đánh giá tại trang Chi tiết sản phẩm (Điểm trung bình, tổng lượt, phân bổ 1-5 sao & không sinh dữ liệu giả khi rỗng)', () => {
    // Khi sản phẩm chưa có đánh giá -> tất cả bằng 0, không có số liệu giả
    const emptyStats = calculateStarDistribution([], null, 0);
    assert.deepEqual(emptyStats.counts, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    assert.deepEqual(emptyStats.percentages, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    assert.equal(emptyStats.totalCounted, 0);

    // Khi sản phẩm có nhiều đánh giá thực tế
    const sampleReviews = [
      { id: 1, rating: 5 },
      { id: 2, rating: 5 },
      { id: 3, rating: 4 },
      { id: 4, rating: 3 },
      { id: 5, rating: 1 }
    ];
    const stats = calculateStarDistribution(sampleReviews, null, 5);
    assert.deepEqual(stats.counts, { 5: 2, 4: 1, 3: 1, 2: 0, 1: 1 });
    assert.deepEqual(stats.percentages, { 5: 40, 4: 20, 3: 20, 2: 0, 1: 20 });

    assert.match(reviewsSectionSrc, /data-testid="review-overview-box"/);
    assert.match(reviewsSectionSrc, /data-testid="review-average-rating"/);
    assert.match(reviewsSectionSrc, /data-testid="review-total-count"/);
    assert.match(reviewsSectionSrc, /data-testid="review-star-breakdown"/);
    assert.match(reviewsSectionSrc, /data-testid=\{`rating-bar-\$\{star\}`\}/);
    assert.match(reviewsSectionSrc, /data-testid=\{`rating-count-\$\{star\}`\}/);
  });

  await t.test('TC-REV-14: Bộ lọc theo số sao (5, 4, 3, 2, 1 sao, Tất cả) và sắp xếp (Mới nhất, Cũ nhất, Số sao cao/thấp)', () => {
    const reviewsList = [
      { id: 1, rating: 4, comment: 'Khá tốt', createdAt: '2026-10-01T08:00:00' },
      { id: 2, rating: 5, comment: 'Tuyệt vời', createdAt: '2026-10-03T10:00:00' },
      { id: 3, rating: 2, comment: 'Chưa ưng', createdAt: '2026-10-02T09:00:00' },
      { id: 4, rating: 5, comment: 'Rất hài lòng', createdAt: '2026-10-04T12:00:00' }
    ];

    // Lọc 5 sao
    const fiveStarOnly = filterAndSortReviews(reviewsList, { starFilter: 5, sortBy: 'createdAt,desc' });
    assert.equal(fiveStarOnly.length, 2);
    assert.deepEqual(fiveStarOnly.map((r) => r.id), [4, 2]);

    // Sắp xếp cũ nhất (createdAt,asc)
    const oldestFirst = filterAndSortReviews(reviewsList, { starFilter: 0, sortBy: 'createdAt,asc' });
    assert.deepEqual(oldestFirst.map((r) => r.id), [1, 3, 2, 4]);

    // Sắp xếp số sao cao nhất (rating,desc)
    const highestRating = filterAndSortReviews(reviewsList, { starFilter: 0, sortBy: 'rating,desc' });
    assert.equal(highestRating[0].rating, 5);
    assert.equal(highestRating[highestRating.length - 1].rating, 2);

    // Sắp xếp số sao thấp nhất (rating,asc)
    const lowestRating = filterAndSortReviews(reviewsList, { starFilter: 0, sortBy: 'rating,asc' });
    assert.equal(lowestRating[0].rating, 2);
    assert.equal(lowestRating[lowestRating.length - 1].rating, 5);

    assert.match(reviewsSectionSrc, /data-testid="star-filter-all"/);
    assert.match(reviewsSectionSrc, /data-testid=\{`star-filter-\$\{star\}`\}/);
    assert.match(reviewsSectionSrc, /data-testid="review-sort-select"/);
  });

  await t.test('TC-REV-15: Danh sách bình luận hiển thị đủ thông tin (tác giả, nhãn đã mua, ngày, sao, nội dung) kèm Phân trang & Load More', () => {
    assert.match(reviewsSectionSrc, /data-testid=\{`review-author-\$\{review\.id\}`\}/);
    assert.match(reviewsSectionSrc, /data-testid=\{`verified-purchase-badge-\$\{review\.id\}`\}/);
    assert.match(reviewsSectionSrc, /data-testid=\{`review-date-\$\{review\.id\}`\}/);
    assert.match(reviewsSectionSrc, /data-testid=\{`review-rating-\$\{review\.id\}`\}/);
    assert.match(reviewsSectionSrc, /data-testid=\{`review-comment-\$\{review\.id\}`\}/);
    assert.match(reviewsSectionSrc, /data-testid="reviews-pagination"/);
    assert.match(reviewsSectionSrc, /data-testid="reviews-load-more-button"/);
    assert.match(reviewsSectionSrc, /data-testid=\{`reviews-page-btn-\$\{pageNum\}`\}/);
    assert.match(productDetailSrc, /data-testid="product-header-rating-link"/);
  });

  await t.test('TC-REV-16: Kiểm tra 7 kịch bản hiển thị nút Đánh giá sản phẩm sau giao hàng (evaluateOrderItemReviewEligibility)', () => {
    const mockUser = { id: 10, fullName: 'Nguyễn Văn A' };
    const baseItems = [{ id: 1, productId: 101, productName: 'MacBook Pro 14' }];

    // 1. Đơn hàng đang chờ xác nhận (PENDING / CONFIRMED) -> Không có nút đánh giá
    for (const st of ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING']) {
      const resPending = evaluateOrderItemReviewEligibility({
        isAuthenticated: true,
        user: mockUser,
        order: { id: 9001, userId: 10, status: st, items: baseItems },
        productId: 101,
        existingReview: null,
        checkingReviews: false,
        reviewCheckError: ''
      });
      assert.equal(resPending.canShowReviewButton, false);
      assert.equal(resPending.canOpenReviewForm, false);
      assert.equal(resPending.reason, 'ORDER_NOT_DELIVERED');
    }

    // 2. Đơn hàng đang vận chuyển (SHIPPING) -> Không có nút đánh giá
    const resShipping = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 9002, userId: 10, status: 'SHIPPING', items: baseItems },
      productId: 101,
      existingReview: null,
      checkingReviews: false,
      reviewCheckError: ''
    });
    assert.equal(resShipping.canShowReviewButton, false);
    assert.equal(resShipping.canOpenReviewForm, false);
    assert.equal(resShipping.reason, 'ORDER_NOT_DELIVERED');

    // 3. Đơn hàng đã giao thành công (DELIVERED) & chưa đánh giá -> Có nút đánh giá
    const resDelivered = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 9003, userId: 10, status: 'DELIVERED', items: baseItems },
      productId: 101,
      existingReview: null,
      checkingReviews: false,
      reviewCheckError: ''
    });
    assert.equal(resDelivered.canShowReviewButton, true);
    assert.equal(resDelivered.canOpenReviewForm, true);
    assert.equal(resDelivered.reason, 'ELIGIBLE');

    // 4. Sản phẩm đã đánh giá -> Ẩn nút đánh giá, hiển thị Đã đánh giá, không thể đánh giá lần hai
    const resAlreadyReviewed = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 9003, userId: 10, status: 'DELIVERED', items: baseItems },
      productId: 101,
      existingReview: { id: 77, productId: 101, rating: 5, comment: 'Tuyệt vời' },
      checkingReviews: false,
      reviewCheckError: ''
    });
    assert.equal(resAlreadyReviewed.canShowReviewButton, false);
    assert.equal(resAlreadyReviewed.canOpenReviewForm, false);
    assert.equal(resAlreadyReviewed.isReviewed, true);
    assert.equal(resAlreadyReviewed.reason, 'ALREADY_REVIEWED');

    // 5. Đơn hàng đã hủy (CANCELLED) hoặc thất bại (FAILED) -> Không có nút đánh giá
    for (const st of ['CANCELLED', 'FAILED']) {
      const resCancelled = evaluateOrderItemReviewEligibility({
        isAuthenticated: true,
        user: mockUser,
        order: { id: 9004, userId: 10, status: st, items: baseItems },
        productId: 101,
        existingReview: null,
        checkingReviews: false,
        reviewCheckError: ''
      });
      assert.equal(resCancelled.canShowReviewButton, false);
      assert.equal(resCancelled.canOpenReviewForm, false);
      assert.equal(resCancelled.reason, 'ORDER_NOT_DELIVERED');
    }

    // 6. Người dùng chưa đăng nhập -> Không thể thực hiện đánh giá
    const resUnauth = evaluateOrderItemReviewEligibility({
      isAuthenticated: false,
      user: null,
      order: { id: 9003, userId: 10, status: 'DELIVERED', items: baseItems },
      productId: 101,
      existingReview: null,
      checkingReviews: false,
      reviewCheckError: ''
    });
    assert.equal(resUnauth.canShowReviewButton, false);
    assert.equal(resUnauth.canOpenReviewForm, false);
    assert.equal(resUnauth.reason, 'NOT_LOGGED_IN');

    // 7a. API chưa tải xong (checkingReviews = true) -> Không hiển thị nút sai điều kiện
    const resLoading = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 9003, userId: 10, status: 'DELIVERED', items: baseItems },
      productId: 101,
      existingReview: null,
      checkingReviews: true,
      reviewCheckError: ''
    });
    assert.equal(resLoading.canShowReviewButton, false);
    assert.equal(resLoading.canOpenReviewForm, false);
    assert.equal(resLoading.isLoading, true);
    assert.equal(resLoading.reason, 'CHECKING_REVIEW_STATUS');

    // 7b. API kiểm tra trạng thái đánh giá bị lỗi -> Không hiển thị nút sai điều kiện
    const resApiError = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 9003, userId: 10, status: 'DELIVERED', items: baseItems },
      productId: 101,
      existingReview: null,
      checkingReviews: false,
      reviewCheckError: 'Network Error'
    });
    assert.equal(resApiError.canShowReviewButton, false);
    assert.equal(resApiError.canOpenReviewForm, false);
    assert.equal(resApiError.isError, true);
    assert.equal(resApiError.reason, 'REVIEW_STATUS_API_ERROR');

    // Kiểm tra tích hợp trên OrderDetail.jsx
    assert.match(orderDetailSrc, /evaluateOrderItemReviewEligibility/);
    assert.match(orderDetailSrc, /order-item-review-loading-/);
    assert.match(orderDetailSrc, /order-item-review-error-/);
    assert.match(orderDetailSrc, /order-item-reviewed-badge-/);
    assert.match(orderDetailSrc, /order-item-review-btn-/);
  });

  await t.test('TC-REV-17: [ADMIN] Định tuyến /admin/reviews được bảo vệ bởi AdminRoute và gắn trên Sidebar + Header Admin', () => {
    assert.match(appRoutesSrc, /<Route element=\{<AdminRoute \/>\}>[\s\S]*path="\/admin\/reviews"[\s\S]*<AdminReviews \/>/);
    assert.match(adminSidebarSrc, /path:\s*'\/admin\/reviews'/);
    assert.match(adminHeaderSrc, /to="\/admin\/reviews"/);
    assert.match(adminReviewsSrc, /!isAuthenticated \|\| !isAdmin/);
  });

  await t.test('TC-REV-18: [ADMIN] Dashboard thống kê tính chính xác Tổng đánh giá, Chờ duyệt, Đã duyệt, Đã ẩn và Điểm TB từ API thật', () => {
    const emptyStats = calculateAdminReviewStats([]);
    assert.deepEqual(emptyStats, {
      totalReviews: 0,
      pendingReviews: 0,
      approvedReviews: 0,
      hiddenReviews: 0,
      averageRating: 0
    });

    const sample = [
      { id: 1, rating: 5, status: REVIEW_MODERATION_STATUS.APPROVED },
      { id: 2, rating: 4, status: REVIEW_MODERATION_STATUS.APPROVED },
      { id: 3, rating: 1, status: REVIEW_MODERATION_STATUS.HIDDEN, hiddenReason: 'Spam hoặc quảng cáo' },
      { id: 4, rating: 3, status: REVIEW_MODERATION_STATUS.PENDING }
    ];
    const stats = calculateAdminReviewStats(sample);
    assert.deepEqual(stats, {
      totalReviews: 4,
      pendingReviews: 1,
      approvedReviews: 2,
      hiddenReviews: 1,
      averageRating: 3.3
    });

    assert.match(adminReviewsSrc, /admin-reviews-kpi-total/);
    assert.match(adminReviewsSrc, /admin-reviews-kpi-pending/);
    assert.match(adminReviewsSrc, /admin-reviews-kpi-approved/);
    assert.match(adminReviewsSrc, /admin-reviews-kpi-hidden/);
    assert.match(adminReviewsSrc, /admin-reviews-kpi-avg/);
  });

  await t.test('TC-REV-19: [ADMIN] Chuẩn hóa PagedResponse từ GET /api/v1/admin/reviews và Tìm kiếm / Lọc / Phân trang Admin', () => {
    const paged = normalizeAdminReviewsPage({
      content: [
        {
          id: 10,
          productId: 101,
          userId: 5,
          orderId: 500,
          rating: 5,
          comment: 'MacBook Pro quá ngon',
          status: 'APPROVED',
          createdAt: '2026-11-01T10:00:00'
        },
        {
          id: 11,
          productId: 102,
          userId: 8,
          orderId: 501,
          rating: 2,
          comment: 'Quảng cáo link spam kiếm tiền',
          status: 'HIDDEN',
          hiddenReason: 'Spam hoặc quảng cáo',
          createdAt: '2026-11-05T15:30:00'
        },
        {
          id: 12,
          productId: 101,
          userId: 9,
          orderId: 502,
          rating: 4,
          comment: 'Giao hàng đúng hẹn',
          status: 'PENDING',
          createdAt: '2026-11-10T09:00:00'
        }
      ],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 3,
      totalPages: 1,
      last: true
    });

    assert.equal(paged.content.length, 3);
    assert.equal(paged.totalElements, 3);

    const enriched = paged.content.map((r) => ({
      ...r,
      productName: r.productId === 101 ? 'MacBook Pro 14 M3' : 'iPhone 16 Pro Max',
      customerName: r.userId === 5 ? 'Nguyễn Văn A' : r.userId === 8 ? 'Trần Spam' : 'Lê Thị C'
    }));

    // Tìm theo tên sản phẩm
    const byProd = filterAdminReviews(enriched, { productQuery: 'macbook' });
    assert.equal(byProd.length, 2);

    // Tìm theo tên khách hàng
    const byCust = filterAdminReviews(enriched, { customerQuery: 'Trần Spam' });
    assert.equal(byCust.length, 1);
    assert.equal(byCust[0].id, 11);

    // Lọc theo số sao
    const byRating = filterAdminReviews(enriched, { ratingFilter: 5 });
    assert.deepEqual(byRating.map((r) => r.id), [10]);

    // Lọc theo trạng thái kiểm duyệt
    const byHidden = filterAdminReviews(enriched, { statusFilter: REVIEW_MODERATION_STATUS.HIDDEN });
    assert.deepEqual(byHidden.map((r) => r.id), [11]);

    // Lọc theo khoảng thời gian & sắp xếp cũ nhất
    const byDateOldest = filterAdminReviews(enriched, {
      startDate: '2026-11-04',
      endDate: '2026-11-11',
      sortBy: 'createdAt,asc'
    });
    assert.deepEqual(byDateOldest.map((r) => r.id), [11, 12]);

    assert.match(adminReviewsSrc, /<Pagination/);
    assert.match(adminReviewsSrc, /data-testid="admin-review-detail-modal"/);
  });

  await t.test('TC-REV-20: [ADMIN] Chức năng Duyệt, Ẩn vi phạm (6 nhóm lý do), Hiện lại đánh giá và Modal xác nhận', () => {
    assert.equal(VIOLATION_REASON_PRESETS.length, 6);
    assert.ok(VIOLATION_REASON_PRESETS.includes('Nội dung xúc phạm, thô tục'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Spam hoặc quảng cáo'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Nội dung không liên quan sản phẩm'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Chứa thông tin cá nhân nhạy cảm'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Đánh giá giả mạo hoặc gian lận'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Vi phạm chính sách hệ thống'));

    assert.match(reviewServiceSrc, /api\.get\('\/admin\/reviews'/);
    assert.match(reviewServiceSrc, /api\.patch\(`\/admin\/reviews\/\$\{reviewId\}\/moderate`/);
    assert.match(reviewServiceSrc, /api\.put\(`\/admin\/reviews\/\$\{reviewId\}\/status`/);

    assert.match(adminReviewsSrc, /data-testid="admin-moderation-cancel-btn"/);
    assert.match(adminReviewsSrc, /data-testid="admin-moderation-confirm-btn"/);
    assert.match(adminReviewsSrc, /data-testid="admin-hide-reason-select"/);
    assert.match(adminReviewsSrc, /data-testid="admin-hide-custom-reason-input"/);
    assert.match(adminReviewsSrc, /data-testid="admin-moderation-error"/);
    assert.match(adminReviewsSrc, /disabled=\{submittingModeration\}/);
  });

  await t.test('TC-REV-21: [SYNC & NO MOCK] Đánh giá HIDDEN/PENDING bị loại khỏi danh sách công khai khách hàng & Admin không dùng mock/localStorage', () => {
    const publicSummary = normalizeReviewSummary(
      {
        productId: 101,
        averageRating: 5.0,
        totalReviews: 1,
        reviews: {
          content: [
            { id: 1, productId: 101, userId: 10, orderId: 1, rating: 5, comment: 'Rất tốt', status: 'APPROVED' },
            { id: 2, productId: 101, userId: 11, orderId: 2, rating: 1, comment: 'Spam ẩn', status: 'HIDDEN' },
            { id: 3, productId: 101, userId: 12, orderId: 3, rating: 4, comment: 'Chờ duyệt', status: 'PENDING' }
          ],
          pageNumber: 0,
          pageSize: 10,
          totalElements: 1,
          totalPages: 1,
          last: true
        }
      },
      101
    );

    assert.equal(publicSummary.reviews.content.length, 1);
    assert.equal(publicSummary.reviews.content[0].id, 1);

    // Đồng bộ sự kiện kiểm duyệt trên trang chi tiết sản phẩm khách hàng
    assert.match(reviewsSectionSrc, /subscribeReviewModerationSync/);
    assert.match(reviewsSectionSrc, /data-testid="my-review-hidden-notice"/);
    assert.match(reviewServiceSrc, /notifyReviewModerationSync/);

    // Không dùng mock data hay localStorage trên AdminReviews.jsx
    assert.doesNotMatch(adminReviewsSrc, /localStorage/);
    assert.doesNotMatch(adminReviewsSrc, /mockData|MOCK_/);
  });
});

