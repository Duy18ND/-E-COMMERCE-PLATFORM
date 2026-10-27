package com.ecommerce.payment.kafka;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.enums.PaymentStatus;
import com.ecommerce.payment.event.OrderCreatedEvent;
import com.ecommerce.payment.service.PaymentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("KafkaOrderConsumer Unit Tests")
class KafkaOrderConsumerTest {

    @Mock
    private PaymentService paymentService;

    @InjectMocks
    private KafkaOrderConsumer kafkaOrderConsumer;

    @Test
    @DisplayName("Should invoke paymentService.processOrderPayment when OrderCreatedEvent is received")
    void testHandleOrderCreated_Success() {
        OrderCreatedEvent event = OrderCreatedEvent.builder()
                .orderId(101L)
                .userId(1L)
                .totalAmount(new BigDecimal("10000000"))
                .paymentMethod("MOCK_ONLINE")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        PaymentResponse mockResponse = PaymentResponse.builder()
                .id(1L)
                .orderId(101L)
                .amount(event.getTotalAmount())
                .paymentMethod("MOCK_ONLINE")
                .status(PaymentStatus.SUCCESS)
                .transactionCode("TXN-123456789")
                .build();

        when(paymentService.processOrderPayment(any(OrderCreatedEvent.class))).thenReturn(mockResponse);

        kafkaOrderConsumer.handleOrderCreated(event);

        verify(paymentService, times(1)).processOrderPayment(event);
    }

    @Test
    @DisplayName("Should handle exception gracefully when paymentService throws error")
    void testHandleOrderCreated_HandlesException() {
        OrderCreatedEvent event = OrderCreatedEvent.builder()
                .orderId(102L)
                .userId(1L)
                .totalAmount(new BigDecimal("5000000"))
                .paymentMethod("MOCK_ONLINE")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        when(paymentService.processOrderPayment(any(OrderCreatedEvent.class)))
                .thenThrow(new RuntimeException("Database connection timeout"));

        // When & Then: Consumer shouldn't crash the container
        kafkaOrderConsumer.handleOrderCreated(event);

        verify(paymentService, times(1)).processOrderPayment(event);
    }
}
