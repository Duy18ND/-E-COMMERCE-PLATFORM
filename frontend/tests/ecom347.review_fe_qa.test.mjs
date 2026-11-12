import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import reviewService, {
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

test('ECOM-347: [FE] QA TEST - UI, RESPONSIVE, LỖI VÀ TÍCH HỢP (ĐÁNH GIÁ SAU MUA)', async (suite) => {
  const reviewServiceSrc = readSrc('services/reviewService.js');
  const reviewFormSrc = readSrc('components/product/ProductReviewForm.jsx');
  const reviewsSectionSrc = readSrc('components/product/ProductReviewsSection.jsx');
  const productDetailSrc = readSrc('pages/customer/ProductDetail.jsx');
  const orderDetailSrc = readSrc('pages/customer/OrderDetail.jsx');
  const ordersHistorySrc = readSrc('pages/customer/Orders.jsx');
  const orderItemSrc = readSrc('components/order/OrderItem.jsx');
  const adminReviewsSrc = readSrc('pages/admin/AdminReviews.jsx');
  const adminSidebarSrc = readSrc('components/admin/AdminSidebar.jsx');
  const adminHeaderSrc = readSrc('components/admin/AdminHeader.jsx');
  const appRoutesSrc = readSrc('routes/AppRoutes.jsx');

  // =========================================================================
  // NHÓM 1: GIAO DIỆN & LUỒNG NGHIỆP VỤ CHÍNH (UI & CORE FLOWS)
  // =========================================================================

  await suite.test('TC-347-01: [UI] Trang Chi tiết sản phẩm tích hợp Khu vực Đánh giá (Header rating, Sao trung bình, Phân bổ 1-5 sao)', () => {
    // 1. Header chi tiết sản phẩm liên kết anchor #product-reviews-section
    assert.match(productDetailSrc, /href="#product-reviews-section"/);
    assert.match(productDetailSrc, /data-testid="product-header-rating-link"/);
    assert.match(productDetailSrc, /<ProductReviewsSection product=\{product\} onSummaryChange=\{setReviewMeta\} \/>/);

    // 2. Tính toán phân bổ sao chuẩn xác
    const sampleReviews = [
      { id: 1, rating: 5, status: 'APPROVED' },
      { id: 2, rating: 5, status: 'APPROVED' },
      { id: 3, rating: 4, status: 'APPROVED' },
      { id: 4, rating: 3, status: 'APPROVED' },
      { id: 5, rating: 1, status: 'APPROVED' }
    ];
    const stats = calculateStarDistribution(sampleReviews, null, 5);
    assert.deepEqual(stats.counts, { 5: 2, 4: 1, 3: 1, 2: 0, 1: 1 });
    assert.deepEqual(stats.percentages, { 5: 40, 4: 20, 3: 20, 2: 0, 1: 20 });
    assert.equal(stats.totalCounted, 5);

    // 3. Không xuất hiện NaN hoặc dữ liệu giả khi sản phẩm chưa có review
    const emptyStats = calculateStarDistribution([], null, 0);
    assert.deepEqual(emptyStats.counts, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    assert.deepEqual(emptyStats.percentages, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    assert.equal(emptyStats.totalCounted, 0);
  });

  await suite.test('TC-347-02: [UI] Bộ lọc số sao và Sắp xếp đánh giá tại ProductReviewsSection', () => {
    const list = [
      { id: 1, rating: 4, comment: 'Khá tốt', createdAt: '2026-10-01T08:00:00' },
      { id: 2, rating: 5, comment: 'Tuyệt vời', createdAt: '2026-10-03T10:00:00' },
      { id: 3, rating: 2, comment: 'Chưa ưng', createdAt: '2026-10-02T09:00:00' },
      { id: 4, rating: 5, comment: 'Rất hài lòng', createdAt: '2026-10-04T12:00:00' }
    ];

    // Lọc 5 sao
    const fiveStarOnly = filterAndSortReviews(list, { starFilter: 5, sortBy: 'createdAt,desc' });
    assert.equal(fiveStarOnly.length, 2);
    assert.deepEqual(fiveStarOnly.map((r) => r.id), [4, 2]);

    // Sắp xếp số sao cao nhất
    const highestRating = filterAndSortReviews(list, { starFilter: 0, sortBy: 'rating,desc' });
    assert.equal(highestRating[0].rating, 5);
    assert.equal(highestRating[highestRating.length - 1].rating, 2);

    // Component có các data-testid cho nút lọc và dropdown sắp xếp
    assert.match(reviewsSectionSrc, /data-testid="star-filter-all"/);
    assert.match(reviewsSectionSrc, /data-testid="review-sort-select"/);
  });

  await suite.test('TC-347-03: [UI] Form đánh giá sao (ProductReviewForm): Tương tác chọn 1-5 sao, đếm ký tự, validation', () => {
    // 1. Kiểm tra validation input
    const valid = validateReviewInput({ rating: 5, comment: 'Sản phẩm rất đẹp và đóng gói cẩn thận', orderId: 100 });
    assert.equal(valid.isValid, true);
    assert.equal(Object.keys(valid.errors).length, 0);

    const missingRating = validateReviewInput({ rating: 0, comment: 'Đẹp', orderId: 100 });
    assert.equal(missingRating.isValid, false);
    assert.ok(missingRating.errors.rating);

    const overLength = validateReviewInput({
      rating: 4,
      comment: 'a'.repeat(MAX_REVIEW_COMMENT_LENGTH + 10),
      orderId: 100
    });
    assert.equal(overLength.isValid, false);
    assert.ok(overLength.errors.comment);

    // 2. Form có các data-testid kiểm thử
    assert.match(reviewFormSrc, /data-testid="submit-review-button"/);
    assert.match(reviewFormSrc, /data-testid="cancel-review-button"/);
    assert.match(reviewFormSrc, /data-testid="review-comment-textarea"/);
    assert.match(reviewFormSrc, /data-testid="comment-char-counter"/);
    assert.match(reviewFormSrc, /data-testid="selected-rating-badge"/);
  });

  await suite.test('TC-347-04: [UI & FLOW] Điều kiện hiển thị nút đánh giá trên Lịch sử đơn hàng (Orders.jsx, OrderItem.jsx) & Chi tiết đơn (OrderDetail.jsx)', () => {
    const mockUser = { id: 10, fullName: 'Nguyễn Văn A' };
    const baseItems = [{ id: 1, productId: 101, productName: 'MacBook Pro 14' }];

    // 1. Đơn DELIVERED và chưa đánh giá -> hiển thị nút đánh giá
    const elEligible = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 5001, userId: 10, status: 'DELIVERED', items: baseItems },
      productId: 101,
      existingReview: null,
      checkingReviews: false,
      reviewCheckError: ''
    });
    assert.equal(elEligible.canShowReviewButton, true);
    assert.equal(elEligible.isReviewed, false);

    // 2. Đơn DELIVERED nhưng đã đánh giá -> hiển thị badge "Đã đánh giá"
    const elReviewed = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 5001, userId: 10, status: 'DELIVERED', items: baseItems },
      productId: 101,
      existingReview: { id: 99, rating: 5 },
      checkingReviews: false,
      reviewCheckError: ''
    });
    assert.equal(elReviewed.canShowReviewButton, false);
    assert.equal(elReviewed.isReviewed, true);

    // 3. Đơn chưa giao (SHIPPING) -> không hiển thị nút đánh giá
    const elShipping = evaluateOrderItemReviewEligibility({
      isAuthenticated: true,
      user: mockUser,
      order: { id: 5002, userId: 10, status: 'SHIPPING', items: baseItems },
      productId: 101,
      existingReview: null,
      checkingReviews: false,
      reviewCheckError: ''
    });
    assert.equal(elShipping.canShowReviewButton, false);
    assert.equal(elShipping.isReviewed, false);

    // 4. Các file JSX có gắn data-testid tương ứng
    assert.match(orderItemSrc, /order-history-review-btn-/);
    assert.match(orderItemSrc, /order-history-reviewed-badge-/);
    assert.match(orderDetailSrc, /order-item-review-btn-/);
    assert.match(orderDetailSrc, /order-item-reviewed-badge-/);
  });

  // =========================================================================
  // NHÓM 2: TRANG QUẢN TRỊ ADMIN (ADMIN REVIEWS MANAGEMENT & MODERATION)
  // =========================================================================

  await suite.test('TC-347-05: [ADMIN] Quản trị đánh giá: Bảo vệ Route, Thống kê, Lọc theo trạng thái & Tìm kiếm', () => {
    // 1. Phân quyền và route admin
    assert.match(appRoutesSrc, /<Route element=\{<AdminRoute \/>\}>[\s\S]*path="\/admin\/reviews"[\s\S]*<AdminReviews \/>/);
    assert.match(adminSidebarSrc, /path:\s*'\/admin\/reviews'/);
    assert.match(adminHeaderSrc, /to="\/admin\/reviews"/);
    assert.match(adminReviewsSrc, /!isAuthenticated \|\| !isAdmin/);

    // 2. Tính toán thống kê Dashboard admin
    const adminStats = calculateAdminReviewStats([
      { id: 1, rating: 5, status: REVIEW_MODERATION_STATUS.APPROVED },
      { id: 2, rating: 4, status: REVIEW_MODERATION_STATUS.APPROVED }
    ]);
    assert.equal(adminStats.totalReviews, 2);
    assert.equal(adminStats.approvedReviews, 2);
    assert.equal(adminStats.averageRating, 4.5);

    // 3. Data testids trên giao diện AdminReviews
    assert.match(adminReviewsSrc, /data-testid="admin-reviews-page"/);
    assert.match(adminReviewsSrc, /data-testid="admin-reviews-table"/);
    assert.match(adminReviewsSrc, /data-testid="admin-reviews-status-filter"/);
  });

  await suite.test('TC-347-06: [ADMIN] Kiểm duyệt đánh giá vi phạm: Duyệt lại, Ẩn vi phạm (6 preset lý do) và Modal xác nhận', () => {
    // 1. Danh sách 6 lý do vi phạm chuẩn hệ thống
    assert.equal(VIOLATION_REASON_PRESETS.length, 6);
    assert.ok(VIOLATION_REASON_PRESETS.includes('Nội dung xúc phạm, thô tục'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Spam hoặc quảng cáo'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Nội dung không liên quan sản phẩm'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Chứa thông tin cá nhân nhạy cảm'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Đánh giá giả mạo hoặc gian lận'));
    assert.ok(VIOLATION_REASON_PRESETS.includes('Vi phạm chính sách hệ thống'));

    // 2. Các nút thao tác kiểm duyệt trên AdminReviews
    assert.match(adminReviewsSrc, /data-testid="admin-hide-reason-select"/);
    assert.match(adminReviewsSrc, /data-testid="admin-moderation-confirm-btn"/);
    assert.match(adminReviewsSrc, /data-testid="admin-moderation-cancel-btn"/);
    assert.match(adminReviewsSrc, /disabled=\{submittingModeration\}/);
  });

  // =========================================================================
  // NHÓM 3: XỬ LÝ LỖI, CÁC TRẠNG THÁI BIÊN & BẢO MẬT (ERROR & EDGE CASES)
  // =========================================================================

  await suite.test('TC-347-07: [ERROR & STATES] Các trạng thái Loading, Empty và Error State trên giao diện', () => {
    // 1. Loading state khi tải danh sách review
    assert.match(reviewsSectionSrc, /data-testid="reviews-loading-state"/);

    // 2. Empty state khi sản phẩm chưa có đánh giá nào
    assert.match(reviewsSectionSrc, /data-testid="reviews-empty-state"/);
    assert.match(reviewsSectionSrc, /Chưa có đánh giá nào cho sản phẩm này/);

    // 3. Error state khi gọi API thất bại
    assert.match(reviewsSectionSrc, /data-testid="reviews-error-state"/);
    assert.match(reviewFormSrc, /data-testid="review-submit-error"/);
    assert.match(adminReviewsSrc, /data-testid="admin-moderation-error"/);
  });

  await suite.test('TC-347-08: [SECURITY & NO ALERTS] Tuyệt đối không dùng alert(), confirm(), prompt() của trình duyệt', () => {
    const filesToAudit = [
      { name: 'reviewService.js', src: reviewServiceSrc },
      { name: 'ProductReviewForm.jsx', src: reviewFormSrc },
      { name: 'ProductReviewsSection.jsx', src: reviewsSectionSrc },
      { name: 'AdminReviews.jsx', src: adminReviewsSrc }
    ];

    for (const f of filesToAudit) {
      assert.doesNotMatch(f.src, /\balert\s*\(/, `${f.name} không được dùng alert()`);
      assert.doesNotMatch(f.src, /\bconfirm\s*\(/, `${f.name} không được dùng confirm()`);
      assert.doesNotMatch(f.src, /\bprompt\s*\(/, `${f.name} không được dùng prompt()`);
    }

    // Modal và Toast được sử dụng thay thế
    assert.match(reviewsSectionSrc, /useNotification|useToast/);
    assert.match(adminReviewsSrc, /useNotification|useToast/);
  });

  await suite.test('TC-347-09: [NO MOCK / REAL BACKEND] Không hardcode mock data hay dùng localStorage để giả lập đánh giá', () => {
    // AdminReviews.jsx không dùng mockData hay localStorage
    assert.doesNotMatch(adminReviewsSrc, /localStorage/);
    assert.doesNotMatch(adminReviewsSrc, /mockData|MOCK_/);

    // reviewService.js gọi trực tiếp Axios API Backend
    assert.match(reviewServiceSrc, /api\.get\(`\/products\/\$\{productId\}\/reviews`/);
    assert.match(reviewServiceSrc, /api\.get\(`\/products\/\$\{productId\}\/reviews\/me`/);
    assert.match(reviewServiceSrc, /api\.post\(`\/products\/\$\{productId\}\/reviews`/);
    assert.match(reviewServiceSrc, /api\.put\(`\/products\/\$\{productId\}\/reviews\/\$\{reviewId\}`/);
    assert.match(reviewServiceSrc, /api\.get\('\/admin\/reviews'/);
    assert.match(reviewServiceSrc, /api\.patch\(`\/admin\/reviews\/\$\{reviewId\}\/moderate`/);
  });

  await suite.test('TC-347-10: [SYNC & ISOLATION] Đánh giá bị ẩn (HIDDEN) hoặc chờ duyệt (PENDING) bị loại khỏi danh sách công khai', () => {
    const rawBackendPayload = {
      productId: 50,
      averageRating: 5.0,
      totalReviews: 1,
      reviews: {
        content: [
          { id: 101, productId: 50, rating: 5, comment: 'Sản phẩm tuyệt vời', status: 'APPROVED' },
          { id: 102, productId: 50, rating: 1, comment: 'Spam quảng cáo', status: 'HIDDEN' },
          { id: 103, productId: 50, rating: 4, comment: 'Chờ duyệt nội dung', status: 'PENDING' }
        ],
        pageNumber: 0,
        pageSize: 10,
        totalElements: 1,
        totalPages: 1,
        last: true
      }
    };

    const normalized = normalizeReviewSummary(rawBackendPayload, 50);
    // Danh sách công khai chỉ còn duy nhất đánh giá APPROVED
    assert.equal(normalized.reviews.content.length, 1);
    assert.equal(normalized.reviews.content[0].id, 101);
    assert.equal(normalized.reviews.content[0].status, 'APPROVED');

    // Có cơ chế đồng bộ sự kiện kiểm duyệt
    assert.match(reviewServiceSrc, /notifyReviewModerationSync/);
    assert.match(reviewsSectionSrc, /subscribeReviewModerationSync/);
  });

  // =========================================================================
  // NHÓM 4: RESPONSIVE DESIGN & TÍNH TƯƠNG THÍCH MÀN HÌNH
  // =========================================================================

  await suite.test('TC-347-11: [RESPONSIVE] Kiểm tra bố cục co giãn và breakpoint trên các kích thước màn hình', () => {
    // 1. Kiểm tra flexWrap, co giãn và responsive styling trong ProductReviewsSection
    assert.match(reviewsSectionSrc, /flexWrap:\s*'wrap'/);

    // 2. Kiểm tra modal và form co giãn trên mobile (max-width, overflow-y: auto)
    assert.match(reviewFormSrc, /maxWidth:\s*'640px'|maxWidth:\s*'620px'|width:\s*'100%'/);
    assert.match(adminReviewsSrc, /table-responsive|overflowX:\s*'auto'/);

    // 3. Kiểm tra responsive.css có hỗ trợ các breakpoint @media (max-width: 768px), (max-width: 480px)
    const responsiveCss = readSrc('styles/responsive.css');
    assert.match(responsiveCss, /@media\s*\(max-width:\s*768px\)/);
    assert.match(responsiveCss, /@media\s*\(max-width:\s*480px\)/);
  });

  await suite.test('TC-347-12: [TOUCH TARGET] Nút bấm, bộ lọc và các ngôi sao đánh giá có kích thước chạm tối thiểu chuẩn UX Mobile', () => {
    // Các button sao trong reviewForm có font-size đủ lớn để touch
    assert.match(reviewFormSrc, /fontSize:\s*'2rem'/);
    assert.match(reviewFormSrc, /cursor:.*'pointer'/);
    assert.match(adminReviewsSrc, /cursor:.*'pointer'/);
  });
});
