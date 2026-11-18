package com.ecommerce.order.producer;

import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
import com.ecommerce.order.event.OrderEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KafkaOrderProducerTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Test
    void sendOrderEventsShouldNotThrowWhenKafkaBrokerUnavailable() {
        KafkaOrderProducer producer = new KafkaOrderProducer(kafkaTemplate);
        ReflectionTestUtils.setField(producer, "orderCreatedTopic", "order-created");
        ReflectionTestUtils.setField(producer, "orderCancelledTopic", "order-cancelled");

        when(kafkaTemplate.send(anyString(), anyString(), any()))
                .thenThrow(new KafkaException("Simulated Kafka broker unavailable"));

        OrderEvent event = OrderEvent.builder()
                .orderId(101L)
                .userId(1L)
                .totalAmount(new BigDecimal("100000"))
                .paymentMethod(PaymentMethod.COD)
                .status(OrderStatus.PENDING)
                .build();

        assertDoesNotThrow(() -> producer.sendOrderCreatedEvent(event));
        assertDoesNotThrow(() -> producer.sendOrderCancelledEvent(event));
    }
}
