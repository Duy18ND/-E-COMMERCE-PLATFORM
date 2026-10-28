package com.ecommerce.product.exception;

/**
 * Exception thrown when a user does not have sufficient privileges to perform an action.
 * Typically mapped to HTTP 403 Forbidden.
 */
public class AccessDeniedException extends RuntimeException {

    public AccessDeniedException(String message) {
        super(message);
    }
}
