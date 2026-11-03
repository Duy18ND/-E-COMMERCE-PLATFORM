package com.ecommerce.order.exception;

/**
 * Ném ra khi tạo hoặc cập nhật tài nguyên bị trùng lặp dữ liệu duy nhất (như mã Voucher, SKU, ...).
 * Sẽ được ánh xạ sang HTTP 409 Conflict bởi GlobalExceptionHandler.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}

