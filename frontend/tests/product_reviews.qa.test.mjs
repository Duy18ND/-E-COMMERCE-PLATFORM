import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateReviewEligibility,
  validateReviewInput,
  normalizeReviewSummary,
  normalizeReview,
  isOrderCompletedForReview,
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
});

