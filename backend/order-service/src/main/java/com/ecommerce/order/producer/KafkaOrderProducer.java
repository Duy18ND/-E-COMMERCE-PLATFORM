package com.ecommerce.order.producer;

import com.ecommerce.order.event.OrderEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaOrderProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.order-created:order-created}")
    private String orderCreatedTopic;

    @Value("${kafka.topics.order-cancelled:order-cancelled}")
    private String orderCancelledTopic;

    /**
     * Gửi message dạng JSON tới topic order-created với payload gồm orderId, userId, totalAmount, paymentMethod.
     * Sử dụng orderId làm message key để đảm bảo message ordering cho từng đơn hàng.
     */
    public void sendOrderCreatedEvent(OrderEvent payload) {
        String key = String.valueOf(payload.getOrderId());
        log.info("Publishing OrderCreatedEvent to topic [{}] with key [{}]: {}", orderCreatedTopic, key, payload);

        CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(orderCreatedTopic, key, payload);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish OrderCreatedEvent for orderId {}: {}", payload.getOrderId(), ex.getMessage(), ex);
            } else {
                log.info("OrderCreatedEvent published successfully for orderId {} to topic [{}] partition [{}] at offset [{}]",
                        payload.getOrderId(),
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }

    /**
     * Đồng bộ sự kiện hủy đơn hàng sang topic order-cancelled để payment-service đóng phiên thanh toán PENDING.
     */
    public void sendOrderCancelledEvent(OrderEvent payload) {
        String key = String.valueOf(payload.getOrderId());
        log.info("Publishing OrderCancelledEvent to topic [{}] with key [{}]: {}", orderCancelledTopic, key, payload);

        CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(orderCancelledTopic, key, payload);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish OrderCancelledEvent for orderId {}: {}", payload.getOrderId(), ex.getMessage(), ex);
            } else {
                log.info("OrderCancelledEvent published successfully for orderId {} to topic [{}] partition [{}] at offset [{}]",
                        payload.getOrderId(),
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
