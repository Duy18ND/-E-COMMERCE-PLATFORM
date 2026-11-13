package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.request.MockPaymentRequest;
import com.ecommerce.payment.dto.response.ApiResponse;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.exception.AccessDeniedException;
import com.ecommerce.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "APIs for payment transaction history and status lookup")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Lấy thông tin thanh toán theo orderId", description = "Tra cứu trạng thái và lịch sử thanh toán của đơn hàng theo Order ID. Chỉ chủ sở hữu hoặc ROLE_ADMIN được xem")
    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrderId(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @Parameter(description = "ID của đơn hàng", example = "101")
            @PathVariable Long orderId) {
        requireAuthenticated(userId);
        log.info("REST request to get payment by orderId: {} from userId: {}", orderId, userId);
        PaymentResponse response = paymentService.getPaymentByOrderId(orderId, userId, userRoles);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thanh toán thành công", response));
    }

    @Operation(summary = "Lấy thông tin thanh toán theo paymentId", description = "Tra cứu chi tiết giao dịch thanh toán theo ID thanh toán. Chỉ chủ sở hữu hoặc ROLE_ADMIN được xem")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentById(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @Parameter(description = "ID của bản ghi thanh toán", example = "1")
            @PathVariable Long id) {
        requireAuthenticated(userId);
        log.info("REST request to get payment by id: {} from userId: {}", id, userId);
        PaymentResponse response = paymentService.getPaymentById(id, userId, userRoles);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết giao dịch thành công", response));
    }

    @Operation(
            summary = "Giả lập / Xác nhận thanh toán đơn hàng",
            description = "Mô phỏng xác nhận thanh toán thành công (success = true) hoặc thất bại (success = false) cho đơn hàng online đang PENDING theo orderId. Chỉ chủ sở hữu hoặc ROLE_ADMIN được phép thực hiện"
    )
    @PostMapping("/mock-pay/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> mockPay(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles,
            @Parameter(description = "ID của đơn hàng cần thanh toán", example = "101")
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) MockPaymentRequest request) {
        requireAuthenticated(userId);
        boolean isSuccess = request == null || request.getSuccess() == null || Boolean.TRUE.equals(request.getSuccess());
        log.info("REST request to mock pay for orderId: {}, userId: {}, success: {}, note: {}",
                orderId, userId, isSuccess, request != null ? request.getNote() : "none");
        PaymentResponse response = paymentService.mockPay(orderId, isSuccess, userId, userRoles);
        String message = isSuccess
                ? "Xác nhận thanh toán mô phỏng thành công"
                : "Thanh toán mô phỏng thất bại — đã kích hoạt hoàn kho (Saga Rollback)";
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    private void requireAuthenticated(Long userId) {
        if (userId == null || userId <= 0) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
        }
    }
}
