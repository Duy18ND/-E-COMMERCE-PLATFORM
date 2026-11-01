package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Order Controller", description = "Quản lý đặt hàng, hủy đơn và tra cứu chi tiết đơn hàng")
public class OrderController {

    private final OrderService orderService;

    /**
     * [Task ECOM-121 / ECOM-123 / ECOM-267] Đặt hàng (Checkout).
     * Hỗ trợ cả đặt hàng kèm danh sách sản phẩm hoặc tự động lấy từ giỏ hàng nếu items rỗng.
     */
    @PostMapping("/checkout")
    @Operation(summary = "Đặt hàng (Checkout)", description = "Lấy userId từ header nội bộ X-User-Id, kiểm tra giá thực tế, trừ kho qua Product Service (Feign), tạo Order PENDING, bắn sự kiện order-created qua Kafka")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @Valid @RequestBody CheckoutRequest request) {

        if (authenticatedUserId != null) {
            request.setUserId(authenticatedUserId);
        } else if (request.getUserId() == null) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
        }

        OrderResponse response = orderService.checkout(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt hàng thành công", response));
    }

    /**
     * [Task ECOM-267] Xây dựng API tạo đơn hàng từ giỏ (Checkout from Cart).
     * Endpoint: POST /api/v1/orders/from-cart
     * Phụ trách bởi: Đoàn Mạnh Duy
     * - Trích xuất userId từ header X-User-Id.
     * - Lấy toàn bộ sản phẩm trong giỏ hàng, trừ tồn kho (@Transactional), lưu đơn hàng và làm trống giỏ hàng.
     */
    @PostMapping("/from-cart")
    @Operation(summary = "Tạo đơn hàng từ giỏ", description = "Lấy các sản phẩm trong giỏ hàng hiện tại của người dùng, kiểm tra tồn kho, tạo đơn hàng và làm trống giỏ hàng")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrderFromCart(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @Valid @RequestBody CheckoutRequest request) {

        if (authenticatedUserId != null) {
            request.setUserId(authenticatedUserId);
        } else if (request.getUserId() == null) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
        }

        OrderResponse response = orderService.createOrderFromCart(request.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đơn hàng từ giỏ thành công", response));
    }

    @PutMapping("/{id}/cancel")
    @Operation(summary = "Hủy đơn hàng", description = "Hủy đơn hàng ở trạng thái PENDING và gọi hoàn kho qua Product Service (Feign). Bắt buộc X-User-Id và kiểm tra quyền sở hữu (chống IDOR)")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {

        requireAuthenticated(authenticatedUserId);

        OrderResponse response = orderService.cancelOrder(id, authenticatedUserId);
        return ResponseEntity.ok(ApiResponse.success("Hủy đơn hàng thành công", response));
    }

    /**
     * Lấy lịch sử đơn hàng của chính người dùng đang đăng nhập (userId lấy từ X-User-Id do Gateway gắn).
     * Khai báo literal path "/my-orders" nên được Spring ưu tiên hơn pattern "/{id}".
     */
    @GetMapping("/my-orders")
    @Operation(summary = "Lấy lịch sử đơn hàng của tôi", description = "Trích xuất userId từ header X-User-Id, FE không cần truyền userId trên URL")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getMyOrders(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        requireAuthenticated(authenticatedUserId);

        List<OrderResponse> response = orderService.getOrdersByUserId(authenticatedUserId, authenticatedUserId, roles);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử đơn hàng thành công", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết đơn hàng", description = "Lấy chi tiết đơn hàng và các item theo ID (chống N+1 query). Chỉ chủ sở hữu hoặc ROLE_ADMIN được xem (chống IDOR)")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {

        requireAuthenticated(authenticatedUserId);

        OrderResponse response = orderService.getOrderById(id, authenticatedUserId, roles);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đơn hàng thành công", response));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Lấy lịch sử đơn hàng của người dùng", description = "Lấy toàn bộ đơn hàng của userId kèm danh sách sản phẩm. Chỉ chính chủ hoặc ROLE_ADMIN được xem")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByUserId(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long userId) {

        requireAuthenticated(authenticatedUserId);

        List<OrderResponse> response = orderService.getOrdersByUserId(userId, authenticatedUserId, roles);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử đơn hàng thành công", response));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private void requireAuthenticated(Long authenticatedUserId) {
        if (authenticatedUserId == null) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
        }
    }
}
