package com.ecommerce.product.security;

import com.ecommerce.product.exception.AccessDeniedException;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;

/**
 * Shared gateway-header authentication and role checks for product-service controllers.
 */
public final class InternalAuthValidator {

    private InternalAuthValidator() {
    }

    public static boolean hasAdminRole(String roles) {
        return roles != null && Arrays.stream(roles.split(","))
                .map(String::trim)
                .anyMatch("ROLE_ADMIN"::equals);
    }

    public static boolean matchesInternalKey(String expectedKey, String providedKey) {
        return StringUtils.hasText(expectedKey)
                && StringUtils.hasText(providedKey)
                && MessageDigest.isEqual(
                        expectedKey.getBytes(StandardCharsets.UTF_8),
                        providedKey.getBytes(StandardCharsets.UTF_8));
    }

    public static void requireAdminRole(String roles, String deniedMessage) {
        if (!hasAdminRole(roles)) {
            throw new AccessDeniedException(deniedMessage);
        }
    }

    public static void requireInternalOrAdmin(
            String expectedInternalKey,
            String internalKey,
            String roles,
            String deniedMessage) {
        if (matchesInternalKey(expectedInternalKey, internalKey) || hasAdminRole(roles)) {
            return;
        }
        throw new AccessDeniedException(deniedMessage);
    }
}

