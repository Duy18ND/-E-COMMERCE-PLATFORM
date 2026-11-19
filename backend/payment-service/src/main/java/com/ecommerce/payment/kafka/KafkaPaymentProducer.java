package com.ecommerce.payment.kafka;

import com.ecommerce.payment.client.OrderSyncClient;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaPaymentProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired(required = false)
    private OrderSyncClient orderSyncClient;

    @Value("${kafka.topics.payment-success:payment-success}")
    private String paymentSuccessTopic;

    @Value("${kafka.topics.payment-failed:payment-failed}")
    private String paymentFailedTopic;

    /**
     * Bắn event payment-success qua Kafka cho order-service
     */
    public void sendPaymentSuccess(PaymentSuccessEvent event) {
        publishEvent(paymentSuccessTopic, "PaymentSuccessEvent", event.getOrderId(), event);
    }

    /**
     * Bắn event payment-failed qua Kafka cho order-service kích hoạt Saga Rollback
     */
    public void sendPaymentFailed(PaymentFailedEvent event) {
        publishEvent(paymentFailedTopic, "PaymentFailedEvent", event.getOrderId(), event);
    }

    private void publishEvent(String topic, String eventName, Long orderId, Object event) {
        String key = String.valueOf(orderId);
        log.info("[Saga Step] Publishing {} to topic [{}] key [{}]: {}", eventName, topic, key, event);
        AtomicBoolean fallbackTriggered = new AtomicBoolean(false);

        try {
            CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(topic, key, event);

            if (future != null) {
                future.whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("[Saga Error] Failed to publish {} for orderId {}: {}",
                                eventName, orderId, ex.getMessage(), ex);
                        fallbackSyncToOrderService(eventName, orderId, event, fallbackTriggered);
                    } else if (result != null && result.getRecordMetadata() != null) {
                        log.info("[Saga Step] {} published successfully for orderId {} to topic [{}] partition [{}] offset [{}]",
                                eventName,
                                orderId,
                                result.getRecordMetadata().topic(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });
            }
        } catch (Exception ex) {
            log.error("[Saga Error] Failed to enqueue {} for orderId {} (Kafka unavailable): {}",
                    eventName, orderId, ex.getMessage());
            fallbackSyncToOrderService(eventName, orderId, event, fallbackTriggered);
        }
    }

    private void fallbackSyncToOrderService(
            String eventName, Long orderId, Object event, AtomicBoolean fallbackTriggered) {
        if (orderSyncClient == null || !fallbackTriggered.compareAndSet(false, true)) {
            return;
        }
        try {
            if (event instanceof PaymentSuccessEvent successEvent) {
                orderSyncClient.syncPaymentSuccess(successEvent);
            } else if (event instanceof PaymentFailedEvent failedEvent) {
                orderSyncClient.syncPaymentFailed(failedEvent);
            }
            log.info("[Internal Sync] Synced {} to order-service for orderId={}", eventName, orderId);
        } catch (Exception syncEx) {
            log.error("[Internal Sync Error] Failed to sync {} for orderId={}: {}",
                    eventName, orderId, syncEx.getMessage());
        }
    }
}
