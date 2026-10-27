package com.ecommerce.order.consumer;

import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaPaymentConsumer {

    private final OrderService orderService;

    /**
     * Lắng nghe sự kiện payment-success từ payment-service.
     * Cập nhật trạng thái Order sang PAID.
     */
    @KafkaListener(
            topics = "${kafka.topics.payment-success:payment-success}",
            groupId = "${spring.kafka.consumer.group-id:order-service-group}"
    )
    public void handlePaymentSuccess(@Payload PaymentSuccessEvent event) {
        log.info("[Saga Step] Received PaymentSuccessEvent for orderId: {}, txn: {}",
                event.getOrderId(), event.getTransactionCode());

        try {
            orderService.handlePaymentSuccess(event);
            log.info("[Saga Step] Successfully processed payment success for orderId: {}", event.getOrderId());
        } catch (Exception ex) {
            log.error("[Saga Error] Failed to process payment success for orderId {}: {}",
                    event.getOrderId(), ex.getMessage(), ex);
        }
    }

    /**
     * Lắng nghe sự kiện payment-failed từ payment-service.
     * Cập nhật trạng thái Order sang FAILED và thực hiện Saga Compensating Transaction (hoàn tồn kho).
     */
    @KafkaListener(
            topics = "${kafka.topics.payment-failed:payment-failed}",
            groupId = "${spring.kafka.consumer.group-id:order-service-group}"
    )
    public void handlePaymentFailed(@Payload PaymentFailedEvent event) {
        log.warn("[Saga Step] Received PaymentFailedEvent for orderId: {}, reason: {}",
                event.getOrderId(), event.getReason());

        try {
            orderService.handlePaymentFailed(event);
            log.info("[Saga Compensation] Successfully finished compensating rollback for orderId: {}", event.getOrderId());
        } catch (Exception ex) {
            log.error("[Saga Error] Failed to process payment failure compensation for orderId {}: {}",
                    event.getOrderId(), ex.getMessage(), ex);
        }
    }
}
