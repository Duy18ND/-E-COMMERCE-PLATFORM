package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    /** Lấy tất cả đánh giá của một sản phẩm (phân trang, không lọc trạng thái) */
    Page<ProductReview> findByProductId(Long productId, Pageable pageable);

    /** Lấy danh sách đánh giá theo sản phẩm và trạng thái kiểm duyệt (cho Public: APPROVED) */
    Page<ProductReview> findByProductIdAndStatus(Long productId, ReviewStatus status, Pageable pageable);

    /** Lấy toàn bộ đánh giá theo trạng thái kiểm duyệt (cho Admin kiểm duyệt) */
    Page<ProductReview> findByStatus(ReviewStatus status, Pageable pageable);

    /** Kiểm tra user đã đánh giá sản phẩm này chưa */
    boolean existsByProductIdAndUserId(Long productId, Long userId);

    /** Lấy đánh giá cụ thể của user cho sản phẩm (để cập nhật/xoá/xem cá nhân) */
    Optional<ProductReview> findByProductIdAndUserId(Long productId, Long userId);

    /** Tính điểm trung bình CHỈ trên các đánh giá APPROVED */
    @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM ProductReview r WHERE r.productId = :productId AND r.status = com.ecommerce.product.enums.ReviewStatus.APPROVED")
    Double calculateAverageRatingByProductId(@Param("productId") Long productId);

    /** Đếm số lượng đánh giá của sản phẩm theo trạng thái */
    long countByProductIdAndStatus(Long productId, ReviewStatus status);

    /** Đếm tổng số lượng đánh giá của sản phẩm */
    long countByProductId(Long productId);
}
