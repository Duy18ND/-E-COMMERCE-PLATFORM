package com.ecommerce.order.entity;

import com.ecommerce.order.enums.VoucherUsageStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * [Task ECOM-166 / ECOM-167 / ECOM-183] Entity lưu lịch sử sử dụng voucher (bảng voucher_usages).
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 * - Theo dõi ai (userId) đã dùng voucher nào (voucherId / voucherCode) cho đơn hàng nào (orderId).
 * - Chặn 1 người dùng áp trùng cùng 1 mã voucher khi trạng thái đang là APPLIED.
 * - Khi đơn hàng bị hủy hoặc thanh toán thất bại, chuyển trạng thái sang RESTORED để hoàn quyền dùng mã cho khách.
 */
@Entity
@Table(
        name = "voucher_usages",
        indexes = {
                @Index(name = "idx_voucher_usage_voucher_user", columnList = "voucher_id, user_id, status"),
                @Index(name = "idx_voucher_usage_code_user", columnList = "voucher_code, user_id, status"),
                @Index(name = "idx_voucher_usage_order_id", columnList = "order_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Column(name = "voucher_code", nullable = false, length = 50)
    private String voucherCode;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private VoucherUsageStatus status = VoucherUsageStatus.APPLIED;

    @CreationTimestamp
    @Column(name = "used_at", nullable = false, updatable = false)
    private LocalDateTime usedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

