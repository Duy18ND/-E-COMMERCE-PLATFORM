package com.ecommerce.payment.service;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.enums.PaymentStatus;
import com.ecommerce.payment.event.OrderCreatedEvent;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.exception.ResourceNotFoundException;
import com.ecommerce.payment.kafka.KafkaPaymentProducer;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentService Unit Tests")
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private KafkaPaymentProducer kafkaPaymentProducer;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @Captor
    private ArgumentCaptor<PaymentSuccessEvent> successEventCaptor;

    @Captor
    private ArgumentCaptor<PaymentFailedEvent> failedEventCaptor;

    private OrderCreatedEvent validOrderEvent;

    @BeforeEach
    void setUp() {
        validOrderEvent = OrderCreatedEvent.builder()
                .orderId(101L)
                .userId(1L)
                .totalAmount(new BigDecimal("15000000")) // 15 triệu VND <= 50 triệu limit
                .paymentMethod("MOCK_ONLINE")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("processOrderPayment Tests (Saga Flow)")
    class ProcessOrderPaymentTests {

        @Test
        @DisplayName("Should process payment successfully when amount <= 50,000,000 VND")
        void testProcessPayment_Success() {
            // Given: Đơn hàng 15.000.000 VND
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
                Payment p = invocation.getArgument(0);
                if (p.getId() == null) {
                    p.setId(1L);
                    p.setCreatedAt(LocalDateTime.now());
                }
                return p;
            });

            // When
            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getOrderId()).isEqualTo(101L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isNotNull().startsWith("TXN-");

            // Verify Kafka event published
            verify(kafkaPaymentProducer, times(1)).sendPaymentSuccess(successEventCaptor.capture());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());

            PaymentSuccessEvent publishedEvent = successEventCaptor.getValue();
            assertThat(publishedEvent.getOrderId()).isEqualTo(101L);
            assertThat(publishedEvent.getTransactionCode()).isEqualTo(response.getTransactionCode());
        }

        @Test
        @DisplayName("Should fail payment and trigger Saga Rollback when amount > 50,000,000 VND")
        void testProcessPayment_Failure_AmountExceedsLimit() {
            // Given: Đơn hàng 60.000.000 VND vượt hạn mức 50 triệu
            validOrderEvent.setTotalAmount(new BigDecimal("60000000"));

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
                Payment p = invocation.getArgument(0);
                if (p.getId() == null) {
                    p.setId(2L);
                    p.setCreatedAt(LocalDateTime.now());
                }
                return p;
            });

            // When
            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getOrderId()).isEqualTo(101L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.FAILED);
            assertThat(response.getTransactionCode()).isNull();

            // Verify Kafka failure event published for Saga Rollback
            verify(kafkaPaymentProducer, times(1)).sendPaymentFailed(failedEventCaptor.capture());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());

            PaymentFailedEvent publishedEvent = failedEventCaptor.getValue();
            assertThat(publishedEvent.getOrderId()).isEqualTo(101L);
            assertThat(publishedEvent.getReason()).contains("vượt hạn mức");
        }

        @Test
        @DisplayName("Should skip re-processing if payment was already SUCCESS (Idempotency)")
        void testProcessPayment_Idempotent_AlreadySuccess() {
            // Given
            Payment existingPayment = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .amount(new BigDecimal("15000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .transactionCode("TXN-ALREADYDONE")
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(existingPayment));

            // When
            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            // Then
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isEqualTo("TXN-ALREADYDONE");

            // Verify no new Kafka event published
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
            verify(paymentRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Lookup Payment Details Tests")
    class LookupPaymentTests {

        @Test
        @DisplayName("getPaymentByOrderId - Should return payment response when order exists")
        void testGetPaymentByOrderId_Success() {
            Payment payment = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .amount(new BigDecimal("5000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .transactionCode("TXN-123456789")
                    .createdAt(LocalDateTime.now())
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(payment));

            PaymentResponse response = paymentService.getPaymentByOrderId(101L);

            assertThat(response).isNotNull();
            assertThat(response.getOrderId()).isEqualTo(101L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isEqualTo("TXN-123456789");
        }

        @Test
        @DisplayName("getPaymentByOrderId - Should throw ResourceNotFoundException when order does not exist")
        void testGetPaymentByOrderId_NotFound() {
            when(paymentRepository.findByOrderId(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> paymentService.getPaymentByOrderId(999L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        @DisplayName("getPaymentById - Should return payment response when ID exists")
        void testGetPaymentById_Success() {
            Payment payment = Payment.builder()
                    .id(10L)
                    .orderId(202L)
                    .amount(new BigDecimal("3000000"))
                    .paymentMethod("COD")
                    .status(PaymentStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build();

            when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));

            PaymentResponse response = paymentService.getPaymentById(10L);

            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(10L);
            assertThat(response.getOrderId()).isEqualTo(202L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
        }

        @Test
        @DisplayName("getPaymentById - Should throw ResourceNotFoundException when ID does not exist")
        void testGetPaymentById_NotFound() {
            when(paymentRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> paymentService.getPaymentById(999L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }
    }
}
