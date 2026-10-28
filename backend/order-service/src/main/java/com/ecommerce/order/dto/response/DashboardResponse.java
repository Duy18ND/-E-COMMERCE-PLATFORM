package com.ecommerce.order.dto.response;

import com.ecommerce.order.enums.OrderStatus;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Map;

/**
 * Thống kê doanh thu và đơn hàng cho Admin Dashboard.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Tổng số đơn hàng trong toàn hệ thống. */
    private Long totalOrders;

    /** Tổng doanh thu (chỉ tính đơn hàng PAID, DELIVERED hoặc hoàn thành). */
    private BigDecimal totalRevenue;

    /** Số lượng đơn hàng phân bổ theo từng trạng thái (PENDING, PAID, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, FAILED, REFUNDED). */
    private Map<OrderStatus, Long> ordersByStatus;
}
