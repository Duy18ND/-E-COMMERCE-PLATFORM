package com.ecommerce.order.dto.response;

import com.ecommerce.order.enums.OrderStatus;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Map;

/**
 * [Task ECOM-145 / ECOM-326] Thống kê doanh thu và đơn hàng cho Admin Dashboard.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
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

    /** Số lượng đơn hàng đang chờ xử lý (PENDING). */
    private Long pendingOrders;

    /** Số lượng đơn hàng đã giao thành công (DELIVERED). */
    private Long completedOrders;

    /** Số lượng đơn hàng đã bị hủy (CANCELLED). */
    private Long cancelledOrders;

    /** Số lượng sản phẩm có lượng tồn kho thấp (sắp hết hàng). */
    private Long lowStockProductsCount;

    /** Tổng số khách hàng (người dùng) trong hệ thống. */
    private Long totalUsers;
}
