package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity đánh giá sản phẩm.
 * Mỗi user chỉ được đánh giá 1 lần cho mỗi sản phẩm (unique constraint).
 * Điều kiện: user phải có đơn hàng DELIVERED chứa sản phẩm này.
 */
@Entity
@Table(
    name = "product_reviews",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"product_id", "user_id"}, name = "uq_review_product_user")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID sản phẩm được đánh giá */
    @Column(name = "product_id", nullable = false)
    private Long productId;

    /** ID người dùng viết đánh giá */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** ID đơn hàng DELIVERED chứa sản phẩm - dùng để xác minh đủ điều kiện đánh giá */
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    /** Điểm đánh giá từ 1 đến 5 */
    @Column(name = "rating", nullable = false)
    private Integer rating;

    /** Nội dung bình luận (tùy chọn) */
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}