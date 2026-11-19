package com.ecommerce.order.client;

import com.ecommerce.order.client.config.FeignConfig;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.event.OrderEvent;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Fallback nội bộ qua HTTP/Feign khi Kafka broker tạm thời không khả dụng (chủ yếu môi trường dev/local),
 * đảm bảo Payment Service vẫn nhận được OrderCreated / OrderCancelled để luồng VietQR và hủy đơn hoạt động thông suốt.
 */
@FeignClient(name = "payment-service", configuration = FeignConfig.class)
public interface PaymentSyncClient {

    @PostMapping("/api/v1/payments/internal/order-created")
    ApiResponse<Void> syncOrderCreated(@RequestBody OrderEvent event);

    @PostMapping("/api/v1/payments/internal/order-cancelled")
    ApiResponse<Void> syncOrderCancelled(@RequestBody OrderEvent event);
}
