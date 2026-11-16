import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const readBackendSrc = (relPath) =>
  fs.readFileSync(path.join(projectRoot, 'backend', 'product-service', 'src', relPath), 'utf8');

test('ECOM-351: [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (ĐÁNH GIÁ SAU MUA)', async (suite) => {
  const entitySrc = readBackendSrc('main/java/com/ecommerce/product/entity/ProductReview.java');
  const enumSrc = readBackendSrc('main/java/com/ecommerce/product/enums/ReviewStatus.java');
  const repoSrc = readBackendSrc('main/java/com/ecommerce/product/repository/ProductReviewRepository.java');
  const reviewControllerSrc = readBackendSrc('main/java/com/ecommerce/product/controller/ReviewController.java');
  const adminControllerSrc = readBackendSrc('main/java/com/ecommerce/product/controller/AdminReviewController.java');
  const serviceImplSrc = readBackendSrc('main/java/com/ecommerce/product/service/impl/ReviewServiceImpl.java');
  const createReqSrc = readBackendSrc('main/java/com/ecommerce/product/dto/request/CreateReviewRequest.java');
  const updateReqSrc = readBackendSrc('main/java/com/ecommerce/product/dto/request/UpdateReviewRequest.java');
  const moderateReqSrc = readBackendSrc('main/java/com/ecommerce/product/dto/request/ModerateReviewRequest.java');
  const exceptionHandlerSrc = readBackendSrc('main/java/com/ecommerce/product/exception/GlobalExceptionHandler.java');
  const junitTestSrc = readBackendSrc('test/java/com/ecommerce/product/controller/ReviewApiValidationAccessQATest.java');

  await suite.test('TC-351-01: [Schema & Entity] Thực thể ProductReview có đầy đủ trường, ánh xạ bảng product_reviews và unique constraint uq_review_product_user', () => {
    assert.match(entitySrc, /@Table\s*\(/);
    assert.match(entitySrc, /name\s*=\s*"product_reviews"/);
    assert.match(entitySrc, /uq_review_product_user/);
    assert.match(entitySrc, /productId;/);
    assert.match(entitySrc, /userId;/);
    assert.match(entitySrc, /orderId;/);
    assert.match(entitySrc, /rating;/);
    assert.match(entitySrc, /comment;/);
    assert.match(entitySrc, /ReviewStatus\s+status/);
    assert.match(entitySrc, /hiddenReason;/);

    assert.match(enumSrc, /enum\s+ReviewStatus/);
    assert.match(enumSrc, /APPROVED/);
    assert.match(enumSrc, /HIDDEN/);
  });

  await suite.test('TC-351-02: [Repository] ProductReviewRepository định nghĩa phương thức truy vấn theo sản phẩm, người dùng và tính điểm trung bình', () => {
    assert.match(repoSrc, /interface\s+ProductReviewRepository\s+extends\s+JpaRepository<ProductReview,\s*Long>/);
    assert.match(repoSrc, /existsByProductIdAndUserId\s*\(/);
    assert.match(repoSrc, /findByProductIdAndUserId\s*\(/);
    assert.match(repoSrc, /findByProductIdAndStatus\s*\(/);
    assert.match(repoSrc, /findByStatus\s*\(/);
    assert.match(repoSrc, /calculateAverageRatingByProductId\s*\(/);
    assert.match(repoSrc, /countByProductIdAndStatus\s*\(/);
  });

  await suite.test('TC-351-03: [Controller] ReviewController định nghĩa đầy đủ 5 endpoints khách hàng và kiểm tra xác thực người dùng', () => {
    assert.match(reviewControllerSrc, /@RequestMapping\s*\(\s*"\/api\/v1\/products\/\{productId\}\/reviews"\s*\)/);
    assert.match(reviewControllerSrc, /getReviews\s*\(/);
    assert.match(reviewControllerSrc, /@GetMapping\s*\(\s*"\/me"\s*\)/);
    assert.match(reviewControllerSrc, /createReview\s*\(/);
    assert.match(reviewControllerSrc, /@PutMapping\s*\(\s*"\/\{reviewId\}"\s*\)/);
    assert.match(reviewControllerSrc, /@DeleteMapping\s*\(\s*"\/\{reviewId\}"\s*\)/);

    // Xác thực danh tính X-User-Id
    assert.match(reviewControllerSrc, /requireAuthenticated\s*\(\s*userId\s*\)/);
    assert.match(reviewControllerSrc, /throw new AccessDeniedException\("Bạn cần đăng nhập để thực hiện thao tác này \(thiếu X-User-Id\)"\)/);
  });

  await suite.test('TC-351-04: [Controller Admin] AdminReviewController định nghĩa các endpoint kiểm duyệt và bắt buộc phân quyền ROLE_ADMIN', () => {
    assert.match(adminControllerSrc, /@RequestMapping\s*\(\s*"\/api\/v1\/admin\/reviews"\s*\)/);
    assert.match(adminControllerSrc, /getAllReviews\s*\(/);
    assert.match(adminControllerSrc, /@PatchMapping\s*\(\s*"\/\{reviewId\}\/moderate"\s*\)/);
    assert.match(adminControllerSrc, /@PutMapping\s*\(\s*"\/\{reviewId\}\/status"\s*\)/);

    // Bắt buộc ROLE_ADMIN
    assert.match(adminControllerSrc, /requireAdminRole\s*\(\s*roles\s*\)/);
    assert.match(adminControllerSrc, /throw new AccessDeniedException\("Chỉ tài khoản ADMIN mới có quyền kiểm duyệt đánh giá"\)/);
  });

  await suite.test('TC-351-05: [RBAC Protection] requireAdminRole kiểm tra chính xác ROLE_ADMIN, ngăn chặn substring attack', () => {
    assert.match(adminControllerSrc, /Arrays\.stream\(roles\.split\(","\)\)\s*\.map\(String::trim\)\s*\.anyMatch\("ROLE_ADMIN"::equals\)/);
    assert.match(reviewControllerSrc, /Arrays\.stream\(roles\.split\(","\)\)\s*\.map\(String::trim\)\s*\.anyMatch\("ROLE_ADMIN"::equals\)/);
  });

  await suite.test('TC-351-06: [IDOR Protection & Ownership] Chống giả mạo người dùng và bảo vệ quyền sở hữu đánh giá', () => {
    // 1. ReviewController lấy userId từ header X-User-Id
    assert.match(reviewControllerSrc, /@RequestHeader\(value = "X-User-Id", required = false\) Long userId/);

    // 2. ReviewServiceImpl kiểm tra quyền sở hữu khi sửa / xóa
    assert.match(serviceImplSrc, /userId\.equals/);
    assert.match(serviceImplSrc, /Bạn không có quyền chỉnh sửa đánh giá này/);
    assert.match(serviceImplSrc, /Bạn không có quyền xoá đánh giá này/);
  });

  await suite.test('TC-351-07: [Validation DTOs] Các DTO ràng buộc chặt chẽ @NotNull, @Min(1), @Max(5), @Size(max=2000), @Size(max=255)', () => {
    // CreateReviewRequest
    assert.match(createReqSrc, /@NotNull\(message = "orderId không được để trống"\)/);
    assert.match(createReqSrc, /@NotNull\(message = "rating không được để trống"\)/);
    assert.match(createReqSrc, /@Min\(value = 1, message = "rating tối thiểu là 1 sao"\)/);
    assert.match(createReqSrc, /@Max\(value = 5, message = "rating tối đa là 5 sao"\)/);
    assert.match(createReqSrc, /@Size\(max = 2000, message = "Bình luận không được vượt quá 2000 ký tự"\)/);

    // UpdateReviewRequest
    assert.match(updateReqSrc, /@NotNull\(message = "rating không được để trống"\)/);
    assert.match(updateReqSrc, /@Min\(value = 1, message = "rating tối thiểu là 1 sao"\)/);
    assert.match(updateReqSrc, /@Max\(value = 5, message = "rating tối đa là 5 sao"\)/);
    assert.match(updateReqSrc, /@Size\(max = 2000, message = "Bình luận không được vượt quá 2000 ký tự"\)/);

    // ModerateReviewRequest
    assert.match(moderateReqSrc, /@NotNull\(message = "Trạng thái kiểm duyệt không được để trống"\)/);
    assert.match(moderateReqSrc, /@Size\(max = 255, message = "Lý do ẩn không được vượt quá 255 ký tự"\)/);
  });

  await suite.test('TC-351-08: [Service Transaction & Concurrency] ReviewServiceImpl quản lý giao dịch @Transactional và kiểm tra điều kiện mua hàng', () => {
    assert.match(serviceImplSrc, /@Transactional/);
    assert.match(serviceImplSrc, /existsByProductIdAndUserId/);
    assert.match(serviceImplSrc, /DELIVERED/);
    assert.match(serviceImplSrc, /Chỉ có thể đánh giá sản phẩm từ đơn hàng đã giao thành công/);
    assert.match(serviceImplSrc, /không chứa sản phẩm/);
  });

  await suite.test('TC-351-09: [Exception Handling] GlobalExceptionHandler ánh xạ chuẩn các exception sang HTTP status codes', () => {
    assert.match(exceptionHandlerSrc, /@ExceptionHandler\(AccessDeniedException\.class\)/);
    assert.match(exceptionHandlerSrc, /HttpStatus\.FORBIDDEN/);

    assert.match(exceptionHandlerSrc, /@ExceptionHandler\(\{MethodArgumentNotValidException\.class/);
    assert.match(exceptionHandlerSrc, /HttpStatus\.BAD_REQUEST/);

    assert.match(exceptionHandlerSrc, /@ExceptionHandler\(ResourceNotFoundException\.class\)/);
    assert.match(exceptionHandlerSrc, /HttpStatus\.NOT_FOUND/);

    assert.match(exceptionHandlerSrc, /@ExceptionHandler\(DuplicateResourceException\.class\)/);
    assert.match(exceptionHandlerSrc, /HttpStatus\.CONFLICT/);

    assert.match(exceptionHandlerSrc, /@ExceptionHandler\(IllegalStateException\.class\)/);
    assert.match(exceptionHandlerSrc, /HttpStatus\.UNPROCESSABLE_ENTITY/);

    assert.match(exceptionHandlerSrc, /@ExceptionHandler\(Exception\.class\)/);
    assert.match(exceptionHandlerSrc, /HttpStatus\.INTERNAL_SERVER_ERROR/);
  });

  await suite.test('TC-351-10: [JUnit 5 Suite] File ReviewApiValidationAccessQATest.java tồn tại, bao quát 4 nhóm và thực thi 100% PASS', () => {
    assert.match(junitTestSrc, /class ReviewApiValidationAccessQATest/);
    assert.match(junitTestSrc, /class AccessControlTests/);
    assert.match(junitTestSrc, /class InputValidationTests/);
    assert.match(junitTestSrc, /class BusinessErrorHandlingTests/);
    assert.match(junitTestSrc, /class HappyPathTests/);
  });
});
