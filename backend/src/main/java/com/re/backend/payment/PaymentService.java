package com.re.backend.payment;

import com.re.backend.order.Order;
import com.re.backend.order.OrderRepository;
import com.re.backend.order.OrderStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;

    // ─────────────────────────────────────────────────────────────
    // MOCK PAYMENT PROCESSING
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public PaymentResponse processMockPayment(Long orderId, String email, boolean isAdmin, boolean success) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        // Kiểm tra quyền sở hữu
        if (!isAdmin && !order.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Bạn không có quyền thực hiện thanh toán cho đơn hàng này");
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy thông tin thanh toán cho đơn hàng #" + orderId));

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new IllegalArgumentException("Đơn hàng này đã được thanh toán thành công");
        }

        if (success) {
            // Thanh toán thành công
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setPaidAt(LocalDateTime.now());
            payment.setTransactionCode(generateTransactionCode());

            // Cập nhật trạng thái đơn hàng → PAID
            order.setStatus(OrderStatus.PAID);
            orderRepository.save(order);
        } else {
            // Thanh toán thất bại
            payment.setStatus(PaymentStatus.FAILED);
        }

        return toPaymentResponse(paymentRepository.save(payment));
    }

    // ─────────────────────────────────────────────────────────────
    // GET PAYMENT BY ORDER ID
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrderId(Long orderId, String email, boolean isAdmin) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        if (!isAdmin && !order.getUser().getEmail().equals(email)) {
            throw new IllegalArgumentException("Bạn không có quyền xem thông tin thanh toán này");
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy thông tin thanh toán cho đơn hàng #" + orderId));

        return toPaymentResponse(payment);
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    /** Sinh mã giao dịch dạng TXN-xxxxxx (6 ký tự uppercase) */
    private String generateTransactionCode() {
        return "TXN-" + UUID.randomUUID().toString()
                .replace("-", "")
                .substring(0, 6)
                .toUpperCase();
    }

    /** Chuyển Payment entity → PaymentResponse DTO */
    private PaymentResponse toPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrder().getId())
                .paymentMethod(payment.getPaymentMethod().name())
                .amount(payment.getAmount())
                .status(payment.getStatus().name())
                .transactionCode(payment.getTransactionCode())
                .paidAt(payment.getPaidAt())
                .build();
    }
}
