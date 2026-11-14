package com.ecommerce.payment.security;

import com.ecommerce.payment.exception.AccessDeniedException;

/**
 * Shared authentication header guards for payment-service.
 */
public final class PaymentAuthHelper {

    private PaymentAuthHelper() {
    }

    public static void requireAuthenticated(Long userId) {
        if (userId == null || userId <= 0) {
            throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
        }
    }
}

