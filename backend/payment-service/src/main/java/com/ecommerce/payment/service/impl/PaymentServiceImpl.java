package com.ecommerce.payment.service.impl;

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
import com.ecommerce.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
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

        if ("CANCELLED".equalsIgnoreCase(event.getStatus()) || "FAILED".equalsIgnoreCase(event.getStatus())) {
            log.warn("[Saga Step] Received OrderCreatedEvent for already {} orderId={}. Closing payment as FAILED.",
                    event.getStatus(), event.getOrderId());
            cancelPaymentForOrder(event.getOrderId(), "Order already " + event.getStatus());
            return paymentRepository.findByOrderId(event.getOrderId())
                    .map(this::mapToPaymentResponse)
                    .orElse(null);
        }

        // 2. Luồng thanh toán COD (Cash On Delivery):
        // Chỉ khởi tạo và lưu bản ghi Payment ở trạng thái PENDING, KHÔNG bắn event payment-success
        // để giữ nguyên trạng thái đơn hàng là PENDING (chờ thanh toán khi nhận hàng).
        if ("COD".equalsIgnoreCase(event.getPaymentMethod())) {
            Payment codPayment = existingPaymentOpt.orElseGet(() -> Payment.builder()
                    .orderId(event.getOrderId())
                    .userId(event.getUserId())
                    .amount(event.getTotalAmount())
                    .paymentMethod("COD")
                    .status(PaymentStatus.PENDING)
                    .build());
            if (event.getUserId() != null) {
                codPayment.setUserId(event.getUserId());
            }
            codPayment.setStatus(PaymentStatus.PENDING);
            Payment savedCodPayment = paymentRepository.save(codPayment);
            log.info("[Saga Step] COD orderId {}: saved PENDING payment id={} without triggering payment-success.",
                    event.getOrderId(), savedCodPayment.getId());
            return mapToPaymentResponse(savedCodPayment);
        }

        // 3. Luồng thanh toán trực tuyến (MOCK_ONLINE / VNPAY / MOMO / BANK_TRANSFER / QR_CODE ...)
        return processMockOnlinePayment(event, existingPaymentOpt);
    }

    /**
     * Luồng xử lý cho các phương thức thanh toán trực tuyến (MOCK_ONLINE, VNPAY, MOMO, BANK_TRANSFER, QR_CODE...):
     * - Nếu amount > 50,000,000 VND -> Chặn hạn mức chống gian lận: tự động THẤT BẠI, kích hoạt Saga Rollback.
     * - Ngược lại -> Chỉ lưu bản ghi Payment ở trạng thái PENDING (chờ khách quét mã VietQR).
     *   KHÔNG tự động phát payment-success: việc chuyển sang SUCCESS / FAILED do người dùng xác nhận
     *   trên màn hình QR thông qua API POST /api/v1/payments/mock-pay/{orderId} (xem {@link #mockPay}).
     */
    private PaymentResponse processMockOnlinePayment(OrderCreatedEvent event, Optional<Payment> existingPaymentOpt) {
        Payment payment = existingPaymentOpt.orElseGet(() -> Payment.builder()
                .orderId(event.getOrderId())
                .userId(event.getUserId())
                .amount(event.getTotalAmount())
                .paymentMethod(event.getPaymentMethod() != null ? event.getPaymentMethod() : "MOCK_ONLINE")
                .status(PaymentStatus.PENDING)
                .build());

        // Đồng bộ lại thông tin từ OrderCreatedEvent nếu bản ghi PENDING được xử lý lại
        if (event.getUserId() != null) {
            payment.setUserId(event.getUserId());
        }
        if (event.getTotalAmount() != null) {
            payment.setAmount(event.getTotalAmount());
        }
        if (event.getPaymentMethod() != null) {
            payment.setPaymentMethod(event.getPaymentMethod());
        }
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
        }

        // Trong hạn mức: giữ nguyên PENDING, chờ khách quét mã QR và xác nhận qua API mock-pay
        log.info("[Saga Step] Online orderId {} (method={}, amount={}) is PENDING, awaiting QR payment confirmation via /mock-pay.",
                event.getOrderId(), savedPendingPayment.getPaymentMethod(), event.getTotalAmount());
        return mapToPaymentResponse(savedPendingPayment);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentResponse mockPay(Long orderId, boolean isSuccess, Long userId, String userRoles) {
        log.info("[Mock Pay] Processing simulated payment confirmation for orderId: {}, userId: {}, isSuccess: {}",
                orderId, userId, isSuccess);

        requireAuthenticated(userId);

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch thanh toán cho đơn hàng ID: " + orderId));

        authorizeAccess(payment, userId, userRoles);

        if ("COD".equalsIgnoreCase(payment.getPaymentMethod())) {
            log.warn("[Mock Pay] Blocked mock-pay attempt on COD orderId={} by userId={}", orderId, userId);
            throw new IllegalStateException("Đơn hàng thanh toán khi nhận hàng (COD) không hỗ trợ thanh toán trực tuyến qua cổng giả lập");
        }

        // Chỉ cho phép mockPay thực thi khi giao dịch đang ở trạng thái PENDING (chặn ghi đè SUCCESS hoặc FAILED).
        if (payment.getStatus() != PaymentStatus.PENDING) {
            log.warn("[Mock Pay] Rejected mock-pay for orderId {}: current status is {}", orderId, payment.getStatus());
            throw new IllegalStateException("Giao dịch của đơn hàng #" + orderId
                    + " đã ở trạng thái " + payment.getStatus() + ", không thể xác nhận hoặc ghi đè thanh toán.");
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
    public PaymentResponse getPaymentByOrderId(Long orderId, Long userId, String userRoles) {
        log.info("Fetching payment details for orderId: {} by userId: {}", orderId, userId);
        requireAuthenticated(userId);
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin thanh toán cho đơn hàng ID: " + orderId));
        authorizeAccess(payment, userId, userRoles);
        return mapToPaymentResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id, Long userId, String userRoles) {
        log.info("Fetching payment details for paymentId: {} by userId: {}", id, userId);
        requireAuthenticated(userId);
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch thanh toán với ID: " + id));
        authorizeAccess(payment, userId, userRoles);
        return mapToPaymentResponse(payment);
    }

    private void requireAuthenticated(Long userId) {
        if (userId == null || userId <= 0) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
        }
    }

    private void authorizeAccess(Payment payment, Long userId, String userRoles) {
        if (hasAdminRole(userRoles)) {
            return;
        }
        if (payment.getUserId() == null || !payment.getUserId().equals(userId)) {
            log.warn("IDOR / unauthorized access blocked: userId={} attempted to access paymentId={} (orderId={}, ownerUserId={})",
                    userId, payment.getId(), payment.getOrderId(), payment.getUserId());
            throw new AccessDeniedException("Bạn không có quyền truy cập hoặc thao tác trên thanh toán của đơn hàng này");
        }
    }

    private boolean hasAdminRole(String userRoles) {
        return userRoles != null && Arrays.stream(userRoles.split(","))
                .map(String::trim)
                .anyMatch("ROLE_ADMIN"::equals);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancelPaymentForOrder(Long orderId, String reason) {
        if (orderId == null) {
            return;
        }
        Optional<Payment> existingOpt = paymentRepository.findByOrderId(orderId);
        if (existingOpt.isPresent()) {
            Payment payment = existingOpt.get();
            if (payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
                log.info("[Order Cancelled Sync] Closed PENDING payment id={} for orderId={} -> FAILED (reason={})",
                        payment.getId(), orderId, reason);
            } else {
                log.warn("[Order Cancelled Sync] Ignored cancel sync for orderId={} because payment status is already {}",
                        orderId, payment.getStatus());
            }
            return;
        }

        // Tạo bản ghi FAILED để chặn OrderCreatedEvent đến trễ hoặc mockPay sau khi đơn đã bị hủy
        Payment tombstone = Payment.builder()
                .orderId(orderId)
                .amount(BigDecimal.ZERO)
                .paymentMethod("CANCELLED")
                .status(PaymentStatus.FAILED)
                .build();
        paymentRepository.save(tombstone);
        log.info("[Order Cancelled Sync] Recorded FAILED payment guard for cancelled orderId={} (reason={})",
                orderId, reason);
    }

    private PaymentResponse mapToPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrderId())
                .userId(payment.getUserId())
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod())
                .status(payment.getStatus())
                .transactionCode(payment.getTransactionCode())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}
