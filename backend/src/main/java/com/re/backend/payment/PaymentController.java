package com.re.backend.payment;

import com.re.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * POST /api/payments/mock-pay/{orderId}
     * Thực hiện thanh toán mô phỏng.
     * Body: { "success": true/false }
     */
    @PostMapping("/mock-pay/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> mockPay(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId,
            @Valid @RequestBody MockPayRequest request) {
        boolean isAdmin = isAdmin(userDetails);
        PaymentResponse payment = paymentService.processMockPayment(
                orderId, userDetails.getUsername(), isAdmin, request.getSuccess());
        String message = request.getSuccess() ? "Thanh toán thành công" : "Thanh toán thất bại";
        return ResponseEntity.ok(ApiResponse.success(message, payment));
    }

    /**
     * GET /api/payments/order/{orderId}
     * Xem thông tin thanh toán của đơn hàng.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPaymentByOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        boolean isAdmin = isAdmin(userDetails);
        PaymentResponse payment = paymentService.getPaymentByOrderId(
                orderId, userDetails.getUsername(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(payment));
    }

    private boolean isAdmin(UserDetails userDetails) {
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_ADMIN"));
    }
}
