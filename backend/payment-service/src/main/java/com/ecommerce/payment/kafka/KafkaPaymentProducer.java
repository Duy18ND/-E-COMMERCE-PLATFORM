package com.ecommerce.payment.kafka;

import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
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
public class KafkaPaymentProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.payment-success:payment-success}")
    private String paymentSuccessTopic;

    @Value("${kafka.topics.payment-failed:payment-failed}")
    private String paymentFailedTopic;

    /**
     * Bắn event payment-success qua Kafka cho order-service
     */
    public void sendPaymentSuccess(PaymentSuccessEvent event) {
        String key = String.valueOf(event.getOrderId());
        log.info("[Saga Step] Publishing PaymentSuccessEvent to topic [{}] key [{}]: {}", paymentSuccessTopic, key, event);

        CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(paymentSuccessTopic, key, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("[Saga Error] Failed to publish PaymentSuccessEvent for orderId {}: {}",
                        event.getOrderId(), ex.getMessage(), ex);
            } else {
                log.info("[Saga Step] PaymentSuccessEvent published successfully for orderId {} to topic [{}] partition [{}] offset [{}]",
                        event.getOrderId(),
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }

    /**
     * Bắn event payment-failed qua Kafka cho order-service kích hoạt Saga Rollback
     */
    public void sendPaymentFailed(PaymentFailedEvent event) {
        String key = String.valueOf(event.getOrderId());
        log.warn("[Saga Step] Publishing PaymentFailedEvent to topic [{}] key [{}]: {}", paymentFailedTopic, key, event);

        CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(paymentFailedTopic, key, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("[Saga Error] Failed to publish PaymentFailedEvent for orderId {}: {}",
                        event.getOrderId(), ex.getMessage(), ex);
            } else {
                log.info("[Saga Step] PaymentFailedEvent published successfully for orderId {} to topic [{}] partition [{}] offset [{}]",
                        event.getOrderId(),
                        result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
