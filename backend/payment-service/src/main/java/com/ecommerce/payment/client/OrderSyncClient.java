package com.ecommerce.payment.client;

import com.ecommerce.payment.client.config.PaymentFeignConfig;
import com.ecommerce.payment.dto.response.ApiResponse;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Fallback nội bộ qua HTTP/Feign khi Kafka broker tạm thời không khả dụng (local dev),
 * đảm bảo order-service cập nhật ngay trạng thái PAID / FAILED + Saga Rollback sau khi thanh toán.
 */
@FeignClient(name = "order-service", configuration = PaymentFeignConfig.class)
public interface OrderSyncClient {

    @PostMapping("/api/v1/orders/internal/payment-success")
    ApiResponse<Void> syncPaymentSuccess(@RequestBody PaymentSuccessEvent event);

    @PostMapping("/api/v1/orders/internal/payment-failed")
    ApiResponse<Void> syncPaymentFailed(@RequestBody PaymentFailedEvent event);
}
