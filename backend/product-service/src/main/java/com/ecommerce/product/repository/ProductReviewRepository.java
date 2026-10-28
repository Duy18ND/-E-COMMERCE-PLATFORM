package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    /** Lấy tất cả đánh giá của một sản phẩm (phân trang) */
    Page<ProductReview> findByProductId(Long productId, Pageable pageable);

    /** Kiểm tra user đã đánh giá sản phẩm này chưa */
    boolean existsByProductIdAndUserId(Long productId, Long userId);

    /** Lấy đánh giá cụ thể của user cho sản phẩm (để cập nhật/xoá) */
    Optional<ProductReview> findByProductIdAndUserId(Long productId, Long userId);

    /** Tính điểm trung bình của sản phẩm */
    @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM ProductReview r WHERE r.productId = :productId")
    Double calculateAverageRatingByProductId(@Param("productId") Long productId);

    /** Đếm số lượng đánh giá của sản phẩm */
    long countByProductId(Long productId);
}