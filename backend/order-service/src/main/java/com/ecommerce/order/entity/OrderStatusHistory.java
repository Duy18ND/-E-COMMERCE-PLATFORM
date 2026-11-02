package com.ecommerce.order.entity;

import com.ecommerce.order.enums.OrderStatus;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * [Task ECOM-171 / ECOM-187] Entity mapping bảng 'order_status_history' trong MySQL.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 *
 * Lưu trữ nhật ký toàn bộ các mốc thay đổi trạng thái của đơn hàng (Timeline):
 * - order_id: Khóa ngoại liên kết tới bảng orders.
 * - status: Trạng thái mới của đơn hàng tại thời điểm cập nhật.
 * - previous_status: Trạng thái trước khi chuyển đổi (null đối với mốc tạo đơn đầu tiên).
 * - action: Hành động kích hoạt (ORDER_CREATED, STATUS_UPDATED, PAYMENT_SUCCESS, CANCELLED, ...).
 * - updated_by: Định danh người thực hiện (CUSTOMER:10, ADMIN:1, SYSTEM, ...).
 * - actor_role: Quyền hạn của actor (ROLE_CUSTOMER, ROLE_ADMIN, SYSTEM).
 * - note: Ghi chú lý do chuyển trạng thái hoặc mã vận đơn.
 * - created_at: Thời điểm chính xác xảy ra sự kiện.
 *
 * Index tối ưu:
 * - idx_status_history_order_id: Tăng tốc truy vấn lịch sử theo mã đơn hàng.
 * - idx_status_history_created_at: Hỗ trợ sắp xếp dòng thời gian chính xác theo thời gian thực.
 */
@Entity
@Table(name = "order_status_history", indexes = {
        @Index(name = "idx_status_history_order_id", columnList = "order_id"),
        @Index(name = "idx_status_history_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusHistory implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonBackReference
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 30)
    private OrderStatus previousStatus;

    @Column(name = "action", length = 50)
    private String action;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "actor_role", length = 50)
    private String actorRole;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

