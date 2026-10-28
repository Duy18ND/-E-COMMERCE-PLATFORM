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

    /** L?y t?t c? ðánh giá c?a m?t s?n ph?m (phân trang) */
    Page<ProductReview> findByProductId(Long productId, Pageable pageable);

    /** Ki?m tra user ð? ðánh giá s?n ph?m này chýa */
    boolean existsByProductIdAndUserId(Long productId, Long userId);

    /** L?y ðánh giá c? th? c?a user cho s?n ph?m (ð? c?p nh?t/xoá) */
    Optional<ProductReview> findByProductIdAndUserId(Long productId, Long userId);

    /** Tính ði?m trung b?nh c?a s?n ph?m */
    @Query("SELECT COALESCE(AVG(r.rating), 0.0) FROM ProductReview r WHERE r.productId = :productId")
    Double calculateAverageRatingByProductId(@Param("productId") Long productId);

    /** Ð?m s? lý?ng ðánh giá c?a s?n ph?m */
    long countByProductId(Long productId);
}
