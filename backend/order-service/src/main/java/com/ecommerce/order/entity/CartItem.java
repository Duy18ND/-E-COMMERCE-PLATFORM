package com.ecommerce.order.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * [Task ECOM-117 / ECOM-252 / ECOM-118] Thiết kế thực thể bảng `cart_items` trên MySQL:
 * - Lưu từng sản phẩm (`product_id`) và số lượng (`quantity`) trong giỏ hàng (`cart_id`).
 * - Ràng buộc duy nhất `uk_cart_item_cart_product` đảm bảo mỗi sản phẩm chỉ xuất hiện 1 dòng trong cùng 1 giỏ.
 */
@Entity
@Table(
    name = "cart_items",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_cart_item_cart_product", columnNames = {"cart_id", "product_id"})
    },
    indexes = {
        @Index(name = "idx_cart_items_cart_id", columnList = "cart_id"),
        @Index(name = "idx_cart_items_product_id", columnList = "product_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItem implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    @JsonBackReference
    private Cart cart;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Integer quantity;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
