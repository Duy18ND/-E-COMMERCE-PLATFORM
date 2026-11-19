package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.response.ApiResponse;
import com.ecommerce.payment.event.OrderCancelledEvent;
import com.ecommerce.payment.event.OrderCreatedEvent;
import com.ecommerce.payment.exception.AccessDeniedException;
import com.ecommerce.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Endpoint nội bộ để order-service đồng bộ bản ghi Payment PENDING/CANCELLED khi Kafka broker tạm thời không khả dụng.
 * Chặn truy cập từ bên ngoài tại API Gateway và kiểm tra X-Internal-Service-Key.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payments/internal")
@RequiredArgsConstructor
public class InternalPaymentController {

    private final PaymentService paymentService;

    @Value("${internal.service-key:ecommerce-internal-service-secret-2026}")
    private String internalServiceKey = "ecommerce-internal-service-secret-2026";

    @PostMapping("/order-created")
    public ResponseEntity<ApiResponse<Void>> syncOrderCreated(
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String internalKey,
            @RequestBody OrderCreatedEvent event) {
        requireInternalKey(internalKey);
        log.info("[Internal Sync] Received OrderCreatedEvent for orderId={}, method={}, amount={}",
                event.getOrderId(), event.getPaymentMethod(), event.getTotalAmount());
        paymentService.processOrderPayment(event);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo giao dịch thanh toán đồng bộ thành công", null));
    }

    @PostMapping("/order-cancelled")
    public ResponseEntity<ApiResponse<Void>> syncOrderCancelled(
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String internalKey,
            @RequestBody OrderCancelledEvent event) {
        requireInternalKey(internalKey);
        log.info("[Internal Sync] Received OrderCancelledEvent for orderId={}", event.getOrderId());
        String reason = event.getReason() != null ? event.getReason() : "Order cancelled event";
        paymentService.cancelPaymentForOrder(event.getOrderId(), reason);
        return ResponseEntity.ok(ApiResponse.success("Đóng giao dịch thanh toán đồng bộ thành công", null));
    }

    private void requireInternalKey(String providedKey) {
        if (providedKey == null || internalServiceKey == null
                || !MessageDigest.isEqual(
                        internalServiceKey.getBytes(StandardCharsets.UTF_8),
                        providedKey.getBytes(StandardCharsets.UTF_8))) {
            throw new AccessDeniedException("Truy cập bị từ chối: thiếu hoặc sai X-Internal-Service-Key");
        }
    }
}
