package com.ecommerce.order.consumer;

import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.event.PaymentSuccessEvent;
import com.ecommerce.order.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("KafkaPaymentConsumer Unit Tests")
class KafkaPaymentConsumerTest {

    @Mock
    private OrderService orderService;

    @InjectMocks
    private KafkaPaymentConsumer kafkaPaymentConsumer;

    @Test
    @DisplayName("Should invoke orderService.handlePaymentSuccess when PaymentSuccessEvent is received")
    void testHandlePaymentSuccess() {
        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .orderId(101L)
                .paymentId(1L)
                .transactionCode("TXN-123456789")
                .timestamp(LocalDateTime.now())
                .build();

        kafkaPaymentConsumer.handlePaymentSuccess(event);

        verify(orderService, times(1)).handlePaymentSuccess(event);
    }

    @Test
    @DisplayName("Should invoke orderService.handlePaymentFailed when PaymentFailedEvent is received")
    void testHandlePaymentFailed() {
        PaymentFailedEvent event = PaymentFailedEvent.builder()
                .orderId(101L)
                .reason("Vượt hạn mức thanh toán")
                .timestamp(LocalDateTime.now())
                .build();

        kafkaPaymentConsumer.handlePaymentFailed(event);

        verify(orderService, times(1)).handlePaymentFailed(event);
    }

    @Test
    @DisplayName("Should handle exception gracefully when orderService throws error")
    void testHandlePaymentFailed_HandlesException() {
        PaymentFailedEvent event = PaymentFailedEvent.builder()
                .orderId(101L)
                .reason("Vượt hạn mức thanh toán")
                .timestamp(LocalDateTime.now())
                .build();

        doThrow(new RuntimeException("DB error")).when(orderService).handlePaymentFailed(any());

        // Should not throw exception
        kafkaPaymentConsumer.handlePaymentFailed(event);

        verify(orderService, times(1)).handlePaymentFailed(event);
    }
}
