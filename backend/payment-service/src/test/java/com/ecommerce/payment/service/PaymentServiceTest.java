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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
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
        @DisplayName("Online <= 50,000,000 VND: chỉ lưu Payment PENDING chờ quét QR, KHÔNG tự động bắn payment-success")
        void testProcessPayment_OnlineWithinLimit_StaysPendingAwaitingQr() {
            // Given: Đơn hàng MOCK_ONLINE 15.000.000 VND
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
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getTransactionCode()).isNull();
            assertThat(response.getAmount()).isEqualByComparingTo("15000000");
            assertThat(response.getPaymentMethod()).isEqualTo("MOCK_ONLINE");

            // Không phát bất kỳ sự kiện Kafka nào — chờ người dùng xác nhận qua /mock-pay
            verify(paymentRepository, times(1)).save(any(Payment.class));
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @ParameterizedTest(name = "Phương thức {0} trong hạn mức -> PENDING chờ quét QR")
        @ValueSource(strings = {"VNPAY", "MOMO", "BANK_TRANSFER", "QR_CODE"})
        @DisplayName("Các phương thức online khác (VNPAY, MOMO, BANK_TRANSFER, QR_CODE) cũng giữ PENDING")
        void testProcessPayment_OtherOnlineMethods_StayPending(String method) {
            validOrderEvent.setPaymentMethod(method);
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getPaymentMethod()).isEqualTo(method);
            assertThat(response.getTransactionCode()).isNull();
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("COD: lưu Payment PENDING, không bắn sự kiện Kafka")
        void testProcessPayment_Cod_StaysPending() {
            validOrderEvent.setPaymentMethod("COD");
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getPaymentMethod()).isEqualTo("COD");
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("Bản ghi PENDING tạo sớm bởi mock-pay (amount = 0) được đồng bộ lại số tiền theo đơn hàng")
        void testProcessPayment_ExistingPending_RefreshesAmount() {
            Payment earlyPending = Payment.builder()
                    .id(5L)
                    .orderId(101L)
                    .amount(BigDecimal.ZERO)
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(earlyPending));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response.getId()).isEqualTo(5L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getAmount()).isEqualByComparingTo("15000000");
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
        }

        @Test
        @DisplayName("Luồng QR đầy đủ: processOrderPayment -> PENDING, sau đó mockPay(true) -> SUCCESS + payment-success")
        void testProcessPayment_ThenMockPay_CompletesQrFlow() {
            Payment[] store = new Payment[1];
            when(paymentRepository.findByOrderId(101L)).thenAnswer(invocation -> Optional.ofNullable(store[0]));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
                Payment p = invocation.getArgument(0);
                if (p.getId() == null) {
                    p.setId(7L);
                }
                store[0] = p;
                return p;
            });

            PaymentResponse pending = paymentService.processOrderPayment(validOrderEvent);
            assertThat(pending.getStatus()).isEqualTo(PaymentStatus.PENDING);
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());

            PaymentResponse paid = paymentService.mockPay(101L, true);

            assertThat(paid.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(paid.getTransactionCode()).isNotNull().startsWith("TXN-");
            verify(kafkaPaymentProducer, times(1)).sendPaymentSuccess(successEventCaptor.capture());
            assertThat(successEventCaptor.getValue().getOrderId()).isEqualTo(101L);
            assertThat(successEventCaptor.getValue().getPaymentId()).isEqualTo(7L);
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

    @Nested
    @DisplayName("[ECOM-269] mockPay Tests (Simulated Payment Flow)")
    class MockPaymentTests {

        @Test
        @DisplayName("mockPay - Thành công: cập nhật SUCCESS, sinh mã giao dịch và phát sự kiện payment-success")
        void testMockPay_Success() {
            Payment payment = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .amount(new BigDecimal("15000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(payment));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.mockPay(101L, true);

            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isNotNull().startsWith("TXN-");
            verify(kafkaPaymentProducer, times(1)).sendPaymentSuccess(any(PaymentSuccessEvent.class));
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Thất bại: cập nhật FAILED và phát sự kiện payment-failed (Saga Rollback)")
        void testMockPay_Failure() {
            Payment payment = Payment.builder()
                    .id(2L)
                    .orderId(102L)
                    .amount(new BigDecimal("5000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findByOrderId(102L)).thenReturn(Optional.of(payment));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.mockPay(102L, false);

            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.FAILED);
            verify(kafkaPaymentProducer, times(1)).sendPaymentFailed(any(PaymentFailedEvent.class));
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
        }

        @Test
        @DisplayName("mockPay - Đã thanh toán trước đó: idempotent trả về kết quả thành công hiện tại")
        void testMockPay_AlreadyPaid_Idempotent_ReturnsSuccess() {
            Payment payment = Payment.builder()
                    .id(3L)
                    .orderId(103L)
                    .amount(new BigDecimal("2000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .transactionCode("TXN-EXISTING123")
                    .build();

            when(paymentRepository.findByOrderId(103L)).thenReturn(Optional.of(payment));

            PaymentResponse response = paymentService.mockPay(103L, true);

            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isEqualTo("TXN-EXISTING123");
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Đơn hàng chưa có bản ghi: tự động khởi tạo và xử lý thành công")
        void testMockPay_OrderNotFound_AutoCreatesPaymentAndProcesses() {
            when(paymentRepository.findByOrderId(999L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
                Payment p = invocation.getArgument(0);
                p.setId(99L);
                return p;
            });

            PaymentResponse response = paymentService.mockPay(999L, true);

            assertThat(response).isNotNull();
            assertThat(response.getOrderId()).isEqualTo(999L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isNotNull().startsWith("TXN-");
            verify(paymentRepository, atLeastOnce()).save(any(Payment.class));
            verify(kafkaPaymentProducer, times(1)).sendPaymentSuccess(any(PaymentSuccessEvent.class));
        }

        @Test
        @DisplayName("mockPay - Giao dịch đã FAILED: từ chối xác nhận thành công (409) để tránh đơn đã rollback bị chuyển PAID")
        void testMockPay_AlreadyFailed_RejectsSuccess() {
            Payment payment = Payment.builder()
                    .id(4L)
                    .orderId(104L)
                    .amount(new BigDecimal("2000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.FAILED)
                    .build();

            when(paymentRepository.findByOrderId(104L)).thenReturn(Optional.of(payment));

            assertThatThrownBy(() -> paymentService.mockPay(104L, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("104");
            verify(paymentRepository, never()).save(any());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Giao dịch đã FAILED: hủy lại là idempotent, không bắn payment-failed lần 2 (tránh hoàn kho 2 lần)")
        void testMockPay_AlreadyFailed_CancelAgain_Idempotent() {
            Payment payment = Payment.builder()
                    .id(5L)
                    .orderId(105L)
                    .amount(new BigDecimal("2000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.FAILED)
                    .build();

            when(paymentRepository.findByOrderId(105L)).thenReturn(Optional.of(payment));

            PaymentResponse response = paymentService.mockPay(105L, false);

            assertThat(response.getStatus()).isEqualTo(PaymentStatus.FAILED);
            verify(paymentRepository, never()).save(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
        }
    }
}
