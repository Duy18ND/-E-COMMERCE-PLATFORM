package com.ecommerce.order.controller;

import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.service.OrderService;
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
 * Endpoint nội bộ để payment-service đồng bộ trạng thái thanh toán (PAID / FAILED + Saga Rollback)
 * khi Kafka broker tạm thời không khả dụng. Chặn truy cập từ bên ngoài tại API Gateway và kiểm tra X-Internal-Service-Key.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/orders/internal")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderService orderService;

    @Value("${internal.service-key:ecommerce-internal-service-secret-2026}")
    private String internalServiceKey = "ecommerce-internal-service-secret-2026";

    @PostMapping("/payment-success")
    public ResponseEntity<ApiResponse<Void>> syncPaymentSuccess(
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String internalKey,
            @RequestBody PaymentSuccessEvent event) {
        requireInternalKey(internalKey);
        log.info("[Internal Sync] Received PaymentSuccessEvent for orderId={}, txn={}",
                event.getOrderId(), event.getTransactionCode());
        orderService.handlePaymentSuccess(event);
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ thanh toán thành công", null));
    }

    @PostMapping("/payment-failed")
    public ResponseEntity<ApiResponse<Void>> syncPaymentFailed(
            @RequestHeader(value = "X-Internal-Service-Key", required = false) String internalKey,
            @RequestBody PaymentFailedEvent event) {
        requireInternalKey(internalKey);
        log.warn("[Internal Sync] Received PaymentFailedEvent for orderId={}, reason={}",
                event.getOrderId(), event.getReason());
        orderService.handlePaymentFailed(event);
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ thất bại thanh toán và hoàn kho thành công", null));
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
