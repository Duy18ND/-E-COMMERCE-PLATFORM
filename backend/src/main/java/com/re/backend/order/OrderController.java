package com.re.backend.order;

import com.re.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * POST /api/orders/checkout
     * Đặt hàng từ giỏ hàng hiện tại.
     */
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CheckoutRequest request) {
        OrderResponse order = orderService.checkoutOrder(userDetails.getUsername(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.created("Đặt hàng thành công", order));
    }

    /**
     * GET /api/orders/my-orders
     * Lịch sử đơn hàng của user hiện tại.
     */
    @GetMapping("/my-orders")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getMyOrders(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<OrderResponse> orders = orderService.getMyOrders(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    /**
     * GET /api/orders/{orderId}
     * Chi tiết 1 đơn hàng (kiểm tra quyền sở hữu).
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        OrderResponse order = orderService.getOrderById(orderId, userDetails.getUsername(), false);
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    /**
     * PUT /api/orders/{orderId}/cancel
     * Khách tự hủy đơn (chỉ khi PENDING).
     */
    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        OrderResponse order = orderService.cancelOrder(orderId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Đơn hàng đã được hủy thành công", order));
    }
}
