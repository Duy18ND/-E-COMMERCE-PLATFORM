package com.re.backend.order;

import com.re.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    /**
     * GET /api/admin/orders
     * Xem toàn bộ đơn hàng (hỗ trợ filter theo ?status=PENDING|PAID|...).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders(
            @RequestParam(required = false) String status) {
        List<OrderResponse> orders = orderService.getAllOrders(status);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    /**
     * GET /api/admin/orders/{orderId}
     * Chi tiết 1 đơn hàng bất kỳ (không giới hạn owner).
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @PathVariable Long orderId) {
        // Admin có quyền xem bất kỳ đơn hàng nào (isAdmin = true)
        OrderResponse order = orderService.getOrderById(orderId, null, true);
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    /**
     * PUT /api/admin/orders/{orderId}/status
     * Admin cập nhật trạng thái đơn hàng (tự động hoàn kho nếu CANCELLED).
     */
    @PutMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        OrderResponse order = orderService.updateOrderStatus(orderId, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật trạng thái đơn hàng thành " + request.getStatus(), order));
    }

    /**
     * GET /api/admin/orders/stats
     * Thống kê Dashboard: tổng đơn, doanh thu, đơn theo trạng thái, tổng user.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<OrderStatsResponse>> getStats() {
        OrderStatsResponse stats = orderService.getOrderStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
