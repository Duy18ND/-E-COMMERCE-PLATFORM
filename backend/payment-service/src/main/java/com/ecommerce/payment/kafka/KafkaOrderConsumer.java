package com.ecommerce.payment.kafka;

import com.ecommerce.payment.event.OrderCreatedEvent;
import com.ecommerce.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaOrderConsumer {

    private final PaymentService paymentService;

    /**
     * Lắng nghe sự kiện order-created từ Kafka để khởi tạo và xử lý thanh toán bất đồng bộ
     */
    @KafkaListener(
            topics = "${kafka.topics.order-created:order-created}",
            groupId = "${spring.kafka.consumer.group-id:payment-service-group}"
    )
    public void handleOrderCreated(@Payload OrderCreatedEvent event) {
        log.info("[Saga Step] Received OrderCreatedEvent for orderId: {}, totalAmount: {}, paymentMethod: {}",
                event.getOrderId(), event.getTotalAmount(), event.getPaymentMethod());

        try {
            paymentService.processOrderPayment(event);
            log.info("[Saga Step] Successfully finished processing payment for orderId: {}", event.getOrderId());
        } catch (Exception ex) {
            log.error("[Saga Error] Unexpected exception while processing payment for orderId {}: {}",
                    event.getOrderId(), ex.getMessage(), ex);
        }
    }
}
