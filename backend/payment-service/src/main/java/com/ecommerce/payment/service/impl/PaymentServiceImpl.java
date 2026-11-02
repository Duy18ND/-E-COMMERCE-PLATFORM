package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.enums.PaymentStatus;
import com.ecommerce.payment.event.OrderCreatedEvent;
import com.ecommerce.payment.event.PaymentFailedEvent;
import com.ecommerce.payment.event.PaymentSuccessEvent;
import com.ecommerce.payment.exception.ResourceNotFoundException;
import com.ecommerce.payment.kafka.KafkaPaymentProducer;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    public static final BigDecimal PAYMENT_LIMIT = new BigDecimal("50000000");

    private final PaymentRepository paymentRepository;
    private final KafkaPaymentProducer kafkaPaymentProducer;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentResponse processOrderPayment(OrderCreatedEvent event) {
        log.info("[Saga Step] Starting payment processing for orderId: {}, amount: {}, method: {}",
                event.getOrderId(), event.getTotalAmount(), event.getPaymentMethod());

        // 1. Kiểm tra tính Idempotent: Nếu đơn hàng đã được xử lý thanh toán, không xử lý lại
        Optional<Payment> existingPaymentOpt = paymentRepository.findByOrderId(event.getOrderId());
        if (existingPaymentOpt.isPresent()) {
            Payment existingPayment = existingPaymentOpt.get();
            if (existingPayment.getStatus() == PaymentStatus.SUCCESS || existingPayment.getStatus() == PaymentStatus.FAILED) {
                log.warn("[Saga Step] Payment for orderId {} already finalized with status: {}. Skipping.",
                        event.getOrderId(), existingPayment.getStatus());
                return mapToPaymentResponse(existingPayment);
            }
        }

        // 2. Luồng thanh toán COD (Cash On Delivery):
        // Chỉ khởi tạo và lưu bản ghi Payment ở trạng thái PENDING, KHÔNG bắn event payment-success
        // để giữ nguyên trạng thái đơn hàng là PENDING (chờ thanh toán khi nhận hàng).
        if ("COD".equalsIgnoreCase(event.getPaymentMethod())) {
            Payment codPayment = existingPaymentOpt.orElseGet(() -> Payment.builder()
                    .orderId(event.getOrderId())
                    .amount(event.getTotalAmount())
                    .paymentMethod("COD")
                    .status(PaymentStatus.PENDING)
                    .build());
            codPayment.setStatus(PaymentStatus.PENDING);
            Payment savedCodPayment = paymentRepository.save(codPayment);
            log.info("[Saga Step] COD orderId {}: saved PENDING payment id={} without triggering payment-success.",
                    event.getOrderId(), savedCodPayment.getId());
            return mapToPaymentResponse(savedCodPayment);
        }

        // 3. Luồng xử lý riêng cho MOCK_ONLINE
        return processMockOnlinePayment(event, existingPaymentOpt);
    }

    /**
     * Luồng xử lý tự động cho phương thức thanh toán trực tuyến giả lập (MOCK_ONLINE):
     * - Nếu amount > 50,000,000 VND -> Giả lập thanh toán THẤT BẠI, kích hoạt Saga Rollback.
     * - Ngược lại -> Giả lập THÀNH CÔNG, sinh transactionCode và phát sự kiện payment-success.
     */
    private PaymentResponse processMockOnlinePayment(OrderCreatedEvent event, Optional<Payment> existingPaymentOpt) {
        Payment payment = existingPaymentOpt.orElseGet(() -> Payment.builder()
                .orderId(event.getOrderId())
                .amount(event.getTotalAmount())
                .paymentMethod(event.getPaymentMethod() != null ? event.getPaymentMethod() : "MOCK_ONLINE")
                .status(PaymentStatus.PENDING)
                .build());

        payment.setStatus(PaymentStatus.PENDING);
        Payment savedPendingPayment = paymentRepository.save(payment);
        log.info("[Saga Step] Saved initial PENDING payment record with id: {} for orderId: {}",
                savedPendingPayment.getId(), event.getOrderId());

        if (event.getTotalAmount() != null && event.getTotalAmount().compareTo(PAYMENT_LIMIT) > 0) {
            String failureReason = "Số dư không đủ hoặc số tiền giao dịch vượt hạn mức thanh toán quy định (> 50.000.000 VNĐ)";
            savedPendingPayment.setStatus(PaymentStatus.FAILED);
            Payment finalizedFailedPayment = paymentRepository.save(savedPendingPayment);

            log.warn("[Saga Step] Payment FAILED for orderId {}: Amount {} exceeds limit {}. Reason: {}",
                    event.getOrderId(), event.getTotalAmount(), PAYMENT_LIMIT, failureReason);

            // Bắn event payment-failed qua Kafka cho order-service kích hoạt Saga Rollback
            PaymentFailedEvent failedEvent = PaymentFailedEvent.builder()
                    .orderId(event.getOrderId())
                    .reason(failureReason)
                    .timestamp(LocalDateTime.now())
                    .build();
            kafkaPaymentProducer.sendPaymentFailed(failedEvent);

            return mapToPaymentResponse(finalizedFailedPayment);
        } else {
            String transactionCode = generateTransactionCode();
            savedPendingPayment.setStatus(PaymentStatus.SUCCESS);
            savedPendingPayment.setTransactionCode(transactionCode);
            Payment finalizedSuccessPayment = paymentRepository.save(savedPendingPayment);

            log.info("[Saga Step] Payment SUCCESS for orderId {}: transactionCode={}",
                    event.getOrderId(), transactionCode);

            // Bắn event payment-success qua Kafka cho order-service hoàn tất đơn hàng
            PaymentSuccessEvent successEvent = PaymentSuccessEvent.builder()
                    .orderId(event.getOrderId())
                    .paymentId(finalizedSuccessPayment.getId())
                    .transactionCode(transactionCode)
                    .timestamp(LocalDateTime.now())
                    .build();
            kafkaPaymentProducer.sendPaymentSuccess(successEvent);

            return mapToPaymentResponse(finalizedSuccessPayment);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentResponse mockPay(Long orderId, boolean isSuccess) {
        log.info("[Mock Pay] Processing simulated payment confirmation for orderId: {}, isSuccess: {}",
                orderId, isSuccess);

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy thông tin thanh toán cho đơn hàng ID: " + orderId));

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Đơn hàng ID " + orderId + " đã được thanh toán thành công trước đó");
        }

        if (isSuccess) {
            String transactionCode = generateTransactionCode();
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setTransactionCode(transactionCode);
            Payment savedPayment = paymentRepository.save(payment);

            log.info("[Mock Pay] Payment SUCCESS for orderId {}: transactionCode={}", orderId, transactionCode);

            PaymentSuccessEvent successEvent = PaymentSuccessEvent.builder()
                    .orderId(orderId)
                    .paymentId(savedPayment.getId())
                    .transactionCode(transactionCode)
                    .timestamp(LocalDateTime.now())
                    .build();
            kafkaPaymentProducer.sendPaymentSuccess(successEvent);

            return mapToPaymentResponse(savedPayment);
        } else {
            String failureReason = "Giao dịch thanh toán mô phỏng thất bại hoặc bị người dùng từ chối";
            payment.setStatus(PaymentStatus.FAILED);
            Payment savedPayment = paymentRepository.save(payment);

            log.warn("[Mock Pay] Payment FAILED for orderId {}: triggering Saga Rollback", orderId);

            PaymentFailedEvent failedEvent = PaymentFailedEvent.builder()
                    .orderId(orderId)
                    .reason(failureReason)
                    .timestamp(LocalDateTime.now())
                    .build();
            kafkaPaymentProducer.sendPaymentFailed(failedEvent);

            return mapToPaymentResponse(savedPayment);
        }
    }

    private String generateTransactionCode() {
        return "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrderId(Long orderId) {
        log.info("Fetching payment details for orderId: {}", orderId);
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin thanh toán cho đơn hàng ID: " + orderId));
        return mapToPaymentResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id) {
        log.info("Fetching payment details for paymentId: {}", id);
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch thanh toán với ID: " + id));
        return mapToPaymentResponse(payment);
    }

    private PaymentResponse mapToPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrderId())
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .transactionCode(payment.getTransactionCode())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}
