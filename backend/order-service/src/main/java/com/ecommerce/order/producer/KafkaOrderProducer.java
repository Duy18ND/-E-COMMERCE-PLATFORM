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
        sendOrderEvent(orderCreatedTopic, "OrderCreatedEvent", payload);
    }

    /**
     * Đồng bộ sự kiện hủy đơn hàng sang topic order-cancelled để payment-service đóng phiên thanh toán PENDING.
     */
    public void sendOrderCancelledEvent(OrderEvent payload) {
        sendOrderEvent(orderCancelledTopic, "OrderCancelledEvent", payload);
    }

    private void sendOrderEvent(String topic, String eventName, OrderEvent payload) {
        String key = String.valueOf(payload.getOrderId());
        log.info("Publishing {} to topic [{}] with key [{}]: {}", eventName, topic, key, payload);

        CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(topic, key, payload);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish {} for orderId {}: {}", eventName, payload.getOrderId(), ex.getMessage(), ex);
            } else {
                log.info("{} published successfully for orderId {} to topic [{}] partition [{}] at offset [{}]",
                        eventName,
                        payload.getOrderId(),
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
