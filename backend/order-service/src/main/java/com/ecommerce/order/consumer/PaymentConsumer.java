package com.ecommerce.order.consumer;

import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * [Saga Orchestration] Kafka Consumer lắng nghe kết quả thanh toán từ payment-service.
 * - payment-success: Chuyển trạng thái Order sang PAID.
 * - payment-failed: Kích hoạt Saga Rollback hoàn lại tồn kho cho Product Service.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentConsumer {

    private final OrderService orderService;

    @KafkaListener(
            topics = "${kafka.topics.payment-success:payment-success}",
            groupId = "${spring.kafka.consumer.group-id:order-service-group}"
    )
    public void handlePaymentSuccess(@Payload PaymentSuccessEvent event) {
        log.info("[Saga Step] Received PaymentSuccessEvent for orderId: {}, txn: {}",
                event.getOrderId(), event.getTransactionCode());
        try {
            orderService.handlePaymentSuccess(event);
        } catch (Exception ex) {
            log.error("[Saga Error] Failed to handle PaymentSuccessEvent for orderId {}: {}",
                    event.getOrderId(), ex.getMessage(), ex);
        }
    }

    @KafkaListener(
            topics = "${kafka.topics.payment-failed:payment-failed}",
            groupId = "${spring.kafka.consumer.group-id:order-service-group}"
    )
    public void handlePaymentFailed(@Payload PaymentFailedEvent event) {
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

