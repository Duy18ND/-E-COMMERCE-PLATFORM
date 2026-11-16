package com.ecommerce.order.consumer;

import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * [Deprecated Delegate] Đã hợp nhất KafkaListener chính thức vào {@link KafkaPaymentConsumer}
 * để tránh đăng ký trùng 2 consumer cùng groupId "order-service-group" trên cùng topic.
 * Giữ lại class helper không gắn @Component/@KafkaListener để tương thích ngược nếu được gọi trực tiếp.
 */
@Slf4j
@RequiredArgsConstructor
public class PaymentConsumer {

    private final OrderService orderService;

    public void handlePaymentSuccess(PaymentSuccessEvent event) {
        log.info("[Saga Step] Received PaymentSuccessEvent for orderId: {}, txn: {}",
                event.getOrderId(), event.getTransactionCode());
        try {
            orderService.handlePaymentSuccess(event);
        } catch (Exception ex) {
            log.error("[Saga Error] Failed to handle PaymentSuccessEvent for orderId {}: {}",
                    event.getOrderId(), ex.getMessage(), ex);
        }
    }

    public void handlePaymentFailed(PaymentFailedEvent event) {
        log.warn("[Saga Step] Received PaymentFailedEvent for orderId: {}, reason: {}",
                event.getOrderId(), event.getReason());
        try {
            orderService.handlePaymentFailed(event);
        } catch (Exception ex) {
            log.error("[Saga Error] Failed to handle PaymentFailedEvent for orderId {}: {}",
                    event.getOrderId(), ex.getMessage(), ex);
        }
    }
}

