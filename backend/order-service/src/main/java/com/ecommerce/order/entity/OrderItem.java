package com.ecommerce.order.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * [Task ECOM-122] Entity mapping bảng 'order_items' trong MySQL.
 * Phụ trách bởi: Đoàn Mạnh Duy
 * Thiết kế schema lưu trữ chi tiết từng mặt hàng tại thời điểm mua (sản phẩm, số lượng, giá mua thực tế).
 * Tích hợp các Index tối ưu hóa truy vấn:
 * - idx_order_item_order_id: Tăng tốc độ JOIN và truy vấn chi tiết đơn hàng (chống N+1 query).
 * - idx_order_item_product_id: Hỗ trợ thống kê sản phẩm bán chạy và quản lý đánh giá sau mua (ECOM-176, ECOM-190).
 */
@Entity
@Table(name = "order_items", indexes = {
        @Index(name = "idx_order_item_order_id", columnList = "order_id"),
        @Index(name = "idx_order_item_product_id", columnList = "product_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonBackReference
    private Order order;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "price_at_purchase", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceAtPurchase;
}
