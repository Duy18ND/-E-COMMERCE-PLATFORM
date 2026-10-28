package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity ðánh giá s?n ph?m.
 * M?i user ch? ðý?c ðánh giá 1 l?n cho m?i s?n ph?m (unique constraint).
 * Ði?u ki?n: user ph?i có ðõn hàng DELIVERED ch?a s?n ph?m này.
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

    /** ID s?n ph?m ðý?c ðánh giá */
    @Column(name = "product_id", nullable = false)
    private Long productId;

    /** ID ngý?i dùng vi?t ðánh giá */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** ID ðõn hàng DELIVERED ch?a s?n ph?m — dùng ð? xác minh ð? ði?u ki?n ðánh giá */
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    /** Ði?m ðánh giá t? 1 ð?n 5 */
    @Column(name = "rating", nullable = false)
    private Integer rating;

    /** N?i dung b?nh lu?n (tu? ch?n) */
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
