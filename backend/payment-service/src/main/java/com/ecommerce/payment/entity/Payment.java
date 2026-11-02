package com.ecommerce.payment.entity;

import com.ecommerce.payment.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * [Task ECOM-122] Entity mapping bảng 'payments' trong MySQL.
 * Phụ trách bởi: Đoàn Mạnh Duy
 * Thiết kế schema lưu trữ lịch sử giao dịch thanh toán mô phỏng (COD, VNPAY, Online Mock).
 * Tích hợp các Index tối ưu hóa truy vấn:
 * - idx_payment_order_id: Tìm kiếm nhanh lịch sử thanh toán theo mã đơn hàng.
 * - idx_payment_transaction_code: Đối soát giao dịch thông qua mã code thanh toán duy nhất.
 */
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payment_order_id", columnList = "orderId"),
        @Index(name = "idx_payment_transaction_code", columnList = "transactionCode")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", nullable = false, length = 50)
    private String paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status;

    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
