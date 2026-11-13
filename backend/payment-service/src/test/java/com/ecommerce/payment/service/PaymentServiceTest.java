package com.ecommerce.payment.service;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.enums.PaymentStatus;
import com.ecommerce.payment.event.OrderCreatedEvent;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.exception.AccessDeniedException;
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
        @DisplayName("Online <= 50,000,000 VND: lưu Payment PENDING kèm userId chờ quét QR, KHÔNG tự động bắn payment-success")
        void testProcessPayment_OnlineWithinLimit_StaysPendingAwaitingQr() {
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
                Payment p = invocation.getArgument(0);
                if (p.getId() == null) {
                    p.setId(1L);
                    p.setCreatedAt(LocalDateTime.now());
                }
                return p;
            });

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response).isNotNull();
            assertThat(response.getOrderId()).isEqualTo(101L);
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getTransactionCode()).isNull();
            assertThat(response.getAmount()).isEqualByComparingTo("15000000");
            assertThat(response.getPaymentMethod()).isEqualTo("MOCK_ONLINE");

            verify(paymentRepository, times(1)).save(any(Payment.class));
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @ParameterizedTest(name = "Phương thức {0} trong hạn mức -> PENDING chờ quét QR")
        @ValueSource(strings = {"VNPAY", "MOMO", "BANK_TRANSFER", "QR_CODE"})
        @DisplayName("Các phương thức online khác (VNPAY, MOMO, BANK_TRANSFER, QR_CODE) cũng giữ PENDING và lưu userId")
        void testProcessPayment_OtherOnlineMethods_StayPending(String method) {
            validOrderEvent.setPaymentMethod(method);
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getPaymentMethod()).isEqualTo(method);
            assertThat(response.getTransactionCode()).isNull();
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("COD: lưu Payment PENDING kèm userId, không bắn sự kiện Kafka")
        void testProcessPayment_Cod_StaysPending() {
            validOrderEvent.setPaymentMethod("COD");
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getPaymentMethod()).isEqualTo("COD");
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("Bản ghi PENDING xử lý lại được đồng bộ userId và số tiền theo đơn hàng")
        void testProcessPayment_ExistingPending_RefreshesAmountAndUserId() {
            Payment existingPending = Payment.builder()
                    .id(5L)
                    .orderId(101L)
                    .amount(BigDecimal.ZERO)
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();
            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(existingPending));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response.getId()).isEqualTo(5L);
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(response.getAmount()).isEqualByComparingTo("15000000");
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
        }

        @Test
        @DisplayName("Luồng QR đầy đủ: processOrderPayment -> PENDING, sau đó chủ đơn gọi mockPay(true) -> SUCCESS + payment-success")
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
            assertThat(pending.getUserId()).isEqualTo(1L);
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());

            PaymentResponse paid = paymentService.mockPay(101L, true, 1L, "ROLE_USER");

            assertThat(paid.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(paid.getTransactionCode()).isNotNull().startsWith("TXN-");
            verify(kafkaPaymentProducer, times(1)).sendPaymentSuccess(successEventCaptor.capture());
            assertThat(successEventCaptor.getValue().getOrderId()).isEqualTo(101L);
            assertThat(successEventCaptor.getValue().getPaymentId()).isEqualTo(7L);
        }

        @Test
        @DisplayName("Should fail payment and trigger Saga Rollback when amount > 50,000,000 VND")
        void testProcessPayment_Failure_AmountExceedsLimit() {
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

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response).isNotNull();
            assertThat(response.getOrderId()).isEqualTo(101L);
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.FAILED);
            assertThat(response.getTransactionCode()).isNull();

            verify(kafkaPaymentProducer, times(1)).sendPaymentFailed(failedEventCaptor.capture());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());

            PaymentFailedEvent publishedEvent = failedEventCaptor.getValue();
            assertThat(publishedEvent.getOrderId()).isEqualTo(101L);
            assertThat(publishedEvent.getReason()).contains("vượt hạn mức");
        }

        @Test
        @DisplayName("Should skip re-processing if payment was already SUCCESS (Idempotency)")
        void testProcessPayment_Idempotent_AlreadySuccess() {
            Payment existingPayment = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .userId(1L)
                    .amount(new BigDecimal("15000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .transactionCode("TXN-ALREADYDONE")
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(existingPayment));

            PaymentResponse response = paymentService.processOrderPayment(validOrderEvent);

            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isEqualTo("TXN-ALREADYDONE");

            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
            verify(paymentRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Lookup Payment Details Tests & IDOR Protection")
    class LookupPaymentTests {

        @Test
        @DisplayName("getPaymentByOrderId - Chủ sở hữu xem thành công")
        void testGetPaymentByOrderId_Success() {
            Payment payment = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .userId(1L)
                    .amount(new BigDecimal("5000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .transactionCode("TXN-123456789")
                    .createdAt(LocalDateTime.now())
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(payment));

            PaymentResponse response = paymentService.getPaymentByOrderId(101L, 1L, "ROLE_USER");

            assertThat(response).isNotNull();
            assertThat(response.getOrderId()).isEqualTo(101L);
            assertThat(response.getUserId()).isEqualTo(1L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isEqualTo("TXN-123456789");
        }

        @Test
        @DisplayName("getPaymentByOrderId - Không tìm thấy bản ghi -> ném ResourceNotFoundException")
        void testGetPaymentByOrderId_NotFound() {
            when(paymentRepository.findByOrderId(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> paymentService.getPaymentByOrderId(999L, 1L, "ROLE_USER"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        @DisplayName("getPaymentByOrderId - Chống IDOR: User A xem đơn của User B -> ném AccessDeniedException (403)")
        void testGetPaymentByOrderId_IdorAttempt_ThrowsAccessDeniedException() {
            Payment paymentOfUserB = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .userId(2L)
                    .amount(new BigDecimal("5000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(paymentOfUserB));

            assertThatThrownBy(() -> paymentService.getPaymentByOrderId(101L, 1L, "ROLE_USER"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Bạn không có quyền truy cập hoặc thao tác trên thanh toán của đơn hàng này");
        }

        @Test
        @DisplayName("getPaymentByOrderId - ROLE_ADMIN được phép xem thanh toán của user khác")
        void testGetPaymentByOrderId_AdminRole_Success() {
            Payment paymentOfUserB = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .userId(2L)
                    .amount(new BigDecimal("5000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(paymentOfUserB));

            PaymentResponse response = paymentService.getPaymentByOrderId(101L, 99L, "ROLE_ADMIN,ROLE_USER");

            assertThat(response.getOrderId()).isEqualTo(101L);
            assertThat(response.getUserId()).isEqualTo(2L);
        }

        @Test
        @DisplayName("getPaymentById - Chủ sở hữu xem thành công")
        void testGetPaymentById_Success() {
            Payment payment = Payment.builder()
                    .id(10L)
                    .orderId(202L)
                    .userId(1L)
                    .amount(new BigDecimal("3000000"))
                    .paymentMethod("COD")
                    .status(PaymentStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build();

            when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));

            PaymentResponse response = paymentService.getPaymentById(10L, 1L, "ROLE_USER");

            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(10L);
            assertThat(response.getOrderId()).isEqualTo(202L);
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
        }

        @Test
        @DisplayName("getPaymentById - Không tìm thấy bản ghi -> ném ResourceNotFoundException")
        void testGetPaymentById_NotFound() {
            when(paymentRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> paymentService.getPaymentById(999L, 1L, "ROLE_USER"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        @DisplayName("getPaymentById - Chống IDOR: User A xem thanh toán của User B -> ném AccessDeniedException (403)")
        void testGetPaymentById_IdorAttempt_ThrowsAccessDeniedException() {
            Payment paymentOfUserB = Payment.builder()
                    .id(10L)
                    .orderId(202L)
                    .userId(2L)
                    .amount(new BigDecimal("3000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findById(10L)).thenReturn(Optional.of(paymentOfUserB));

            assertThatThrownBy(() -> paymentService.getPaymentById(10L, 1L, "ROLE_USER"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Bạn không có quyền truy cập hoặc thao tác trên thanh toán của đơn hàng này");
        }

        @Test
        @DisplayName("getPaymentById - Chống false-positive role (ROLE_ADMIN_VIEWER không được bypass IDOR)")
        void testGetPaymentById_FalsePositiveAdminRole_ThrowsAccessDeniedException() {
            Payment paymentOfUserB = Payment.builder()
                    .id(10L)
                    .orderId(202L)
                    .userId(2L)
                    .amount(new BigDecimal("3000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findById(10L)).thenReturn(Optional.of(paymentOfUserB));

            assertThatThrownBy(() -> paymentService.getPaymentById(10L, 1L, "ROLE_ADMIN_VIEWER"))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("[ECOM-269] mockPay Tests (Simulated Payment Flow & Security)")
    class MockPaymentTests {

        @Test
        @DisplayName("mockPay - Thành công: chủ đơn xác nhận -> cập nhật SUCCESS, sinh mã giao dịch và phát payment-success")
        void testMockPay_Success() {
            Payment payment = Payment.builder()
                    .id(1L)
                    .orderId(101L)
                    .userId(1L)
                    .amount(new BigDecimal("15000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findByOrderId(101L)).thenReturn(Optional.of(payment));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.mockPay(101L, true, 1L, "ROLE_USER");

            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            assertThat(response.getTransactionCode()).isNotNull().startsWith("TXN-");
            verify(kafkaPaymentProducer, times(1)).sendPaymentSuccess(any(PaymentSuccessEvent.class));
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Thất bại: chủ đơn từ chối -> cập nhật FAILED và phát payment-failed (Saga Rollback)")
        void testMockPay_Failure() {
            Payment payment = Payment.builder()
                    .id(2L)
                    .orderId(102L)
                    .userId(1L)
                    .amount(new BigDecimal("5000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findByOrderId(102L)).thenReturn(Optional.of(payment));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.mockPay(102L, false, 1L, "ROLE_USER");

            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(PaymentStatus.FAILED);
            verify(kafkaPaymentProducer, times(1)).sendPaymentFailed(any(PaymentFailedEvent.class));
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
        }

        @Test
        @DisplayName("mockPay - Chống IDOR: User A gọi mockPay (thanh toán/hủy) đơn của User B -> ném AccessDeniedException (403)")
        void testMockPay_IdorAttempt_ThrowsAccessDeniedException() {
            Payment paymentOfUserB = Payment.builder()
                    .id(10L)
                    .orderId(106L)
                    .userId(2L)
                    .amount(new BigDecimal("5000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findByOrderId(106L)).thenReturn(Optional.of(paymentOfUserB));

            assertThatThrownBy(() -> paymentService.mockPay(106L, true, 1L, "ROLE_USER"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Bạn không có quyền truy cập hoặc thao tác trên thanh toán của đơn hàng này");

            assertThatThrownBy(() -> paymentService.mockPay(106L, false, 1L, "ROLE_USER"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Bạn không có quyền truy cập hoặc thao tác trên thanh toán của đơn hàng này");

            verify(paymentRepository, never()).save(any());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Thiếu userId xác thực -> ném AccessDeniedException (403)")
        void testMockPay_MissingUserId_ThrowsAccessDeniedException() {
            assertThatThrownBy(() -> paymentService.mockPay(101L, true, null, "ROLE_USER"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("X-User-Id");

            verify(paymentRepository, never()).findByOrderId(any());
            verify(paymentRepository, never()).save(any());
        }

        @Test
        @DisplayName("mockPay - ROLE_ADMIN được phép thao tác xác nhận thanh toán cho đơn hợp lệ")
        void testMockPay_AdminRole_Success() {
            Payment paymentOfUserB = Payment.builder()
                    .id(11L)
                    .orderId(107L)
                    .userId(2L)
                    .amount(new BigDecimal("3000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findByOrderId(107L)).thenReturn(Optional.of(paymentOfUserB));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PaymentResponse response = paymentService.mockPay(107L, true, 99L, "ROLE_ADMIN");

            assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
            verify(kafkaPaymentProducer, times(1)).sendPaymentSuccess(any(PaymentSuccessEvent.class));
        }

        @Test
        @DisplayName("mockPay - orderId không tồn tại: ném ResourceNotFoundException (404), KHÔNG tự tạo Payment 0đ")
        void testMockPay_OrderNotFound_ThrowsResourceNotFoundException() {
            when(paymentRepository.findByOrderId(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> paymentService.mockPay(999L, true, 1L, "ROLE_USER"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy giao dịch thanh toán cho đơn hàng ID: 999");

            verify(paymentRepository, never()).save(any());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Đơn hàng COD: chặn bằng IllegalStateException, không thể ép đơn COD thành PAID")
        void testMockPay_CodOrder_ThrowsIllegalStateException() {
            Payment codPayment = Payment.builder()
                    .id(12L)
                    .orderId(108L)
                    .userId(1L)
                    .amount(new BigDecimal("1200000"))
                    .paymentMethod("COD")
                    .status(PaymentStatus.PENDING)
                    .build();

            when(paymentRepository.findByOrderId(108L)).thenReturn(Optional.of(codPayment));

            assertThatThrownBy(() -> paymentService.mockPay(108L, true, 1L, "ROLE_USER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("COD");

            assertThatThrownBy(() -> paymentService.mockPay(108L, false, 1L, "ROLE_USER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("COD");

            verify(paymentRepository, never()).save(any());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Đã thanh toán (SUCCESS): chặn ghi đè bằng IllegalStateException")
        void testMockPay_AlreadyPaid_ThrowsIllegalStateException() {
            Payment payment = Payment.builder()
                    .id(3L)
                    .orderId(103L)
                    .userId(1L)
                    .amount(new BigDecimal("2000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.SUCCESS)
                    .transactionCode("TXN-EXISTING123")
                    .build();

            when(paymentRepository.findByOrderId(103L)).thenReturn(Optional.of(payment));

            assertThatThrownBy(() -> paymentService.mockPay(103L, true, 1L, "ROLE_USER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("103");

            assertThatThrownBy(() -> paymentService.mockPay(103L, false, 1L, "ROLE_USER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("103");

            verify(paymentRepository, never()).save(any());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("mockPay - Giao dịch đã FAILED: chặn ghi đè bằng IllegalStateException cho cả success=true và success=false")
        void testMockPay_AlreadyFailed_ThrowsIllegalStateException() {
            Payment payment = Payment.builder()
                    .id(4L)
                    .orderId(104L)
                    .userId(1L)
                    .amount(new BigDecimal("2000000"))
                    .paymentMethod("MOCK_ONLINE")
                    .status(PaymentStatus.FAILED)
                    .build();

            when(paymentRepository.findByOrderId(104L)).thenReturn(Optional.of(payment));

            assertThatThrownBy(() -> paymentService.mockPay(104L, true, 1L, "ROLE_USER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("104");

            assertThatThrownBy(() -> paymentService.mockPay(104L, false, 1L, "ROLE_USER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("104");

            verify(paymentRepository, never()).save(any());
            verify(kafkaPaymentProducer, never()).sendPaymentSuccess(any());
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }

        @Test
        @DisplayName("cancelPaymentForOrder - Đồng bộ hủy đơn từ order-service: chuyển PENDING -> FAILED và chặn mockPay")
        void testCancelPaymentForOrder_ClosesPendingAndBlocksMockPay() {
            Payment[] store = new Payment[]{
                    Payment.builder()
                            .id(8L)
                            .orderId(205L)
                            .userId(1L)
                            .amount(new BigDecimal("1500000"))
                            .paymentMethod("MOCK_ONLINE")
                            .status(PaymentStatus.PENDING)
                            .build()
            };
            when(paymentRepository.findByOrderId(205L)).thenAnswer(inv -> Optional.ofNullable(store[0]));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
                Payment saved = inv.getArgument(0);
                store[0] = saved;
                return saved;
            });

            paymentService.cancelPaymentForOrder(205L, "Khách hàng hủy đơn");

            assertThat(store[0].getStatus()).isEqualTo(PaymentStatus.FAILED);
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());

            assertThatThrownBy(() -> paymentService.mockPay(205L, true, 1L, "ROLE_USER"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("205");
        }

        @Test
        @DisplayName("cancelPaymentForOrder - Đơn chưa có Payment record vẫn tạo tombstone FAILED chặn OrderCreatedEvent trễ")
        void testCancelPaymentForOrder_NoRecord_CreatesFailedGuard() {
            when(paymentRepository.findByOrderId(206L)).thenReturn(Optional.empty());
            when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

            paymentService.cancelPaymentForOrder(206L, "Hủy trước khi tạo payment");

            verify(paymentRepository).save(argThat(p ->
                    Long.valueOf(206L).equals(p.getOrderId()) && p.getStatus() == PaymentStatus.FAILED));
            verify(kafkaPaymentProducer, never()).sendPaymentFailed(any());
        }
    }
}
