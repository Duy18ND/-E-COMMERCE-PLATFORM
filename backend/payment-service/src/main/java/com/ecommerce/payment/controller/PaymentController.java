package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.response.ApiResponse;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    @Operation(summary = "Lấy thông tin thanh toán theo orderId", description = "Tra cứu trạng thái và lịch sử thanh toán của đơn hàng theo Order ID")
    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrderId(
            @Parameter(description = "ID của đơn hàng", example = "101")
            @PathVariable Long orderId) {
        log.info("REST request to get payment by orderId: {}", orderId);
        PaymentResponse response = paymentService.getPaymentByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thanh toán thành công", response));
    }

    @Operation(summary = "Lấy thông tin thanh toán theo paymentId", description = "Tra cứu chi tiết giao dịch thanh toán theo ID thanh toán")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentById(
            @Parameter(description = "ID của bản ghi thanh toán", example = "1")
            @PathVariable Long id) {
        log.info("REST request to get payment by id: {}", id);
        PaymentResponse response = paymentService.getPaymentById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết giao dịch thành công", response));
    }
}
