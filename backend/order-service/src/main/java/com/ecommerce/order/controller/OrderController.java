package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.OrderResponse;
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

    @PostMapping("/checkout")
    @Operation(summary = "Đặt hàng (Checkout)", description = "Trừ kho qua Product Service (Feign), tạo Order PENDING, bắn sự kiện order-created qua Kafka")
    public ResponseEntity<ApiResponse<OrderResponse>> checkout(@Valid @RequestBody CheckoutRequest request) {
        OrderResponse response = orderService.checkout(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đặt hàng thành công", response));
    }

    @PutMapping("/{id}/cancel")
    @Operation(summary = "Hủy đơn hàng", description = "Hủy đơn hàng ở trạng thái PENDING và gọi hoàn kho qua Product Service (Feign)")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(@PathVariable Long id) {
        OrderResponse response = orderService.cancelOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Hủy đơn hàng thành công", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết đơn hàng", description = "Lấy thông tin chi tiết đơn hàng và các item theo ID (chống N+1 query)")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long id) {
        OrderResponse response = orderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đơn hàng thành công", response));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Lấy lịch sử đơn hàng của người dùng", description = "Lấy toàn bộ đơn hàng của userId kèm danh sách sản phẩm")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByUserId(@PathVariable Long userId) {
        List<OrderResponse> response = orderService.getOrdersByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử đơn hàng thành công", response));
    }
}
