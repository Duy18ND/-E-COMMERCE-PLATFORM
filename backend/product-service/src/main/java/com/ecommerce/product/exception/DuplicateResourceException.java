package com.ecommerce.product.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * [Task ECOM-238 / ECOM-239] Ngoại lệ nghiệp vụ khi dữ liệu bị trùng lặp
 * (ví dụ: tên danh mục đã tồn tại). Được GlobalExceptionHandler ánh xạ sang
 * HTTP 409 CONFLICT.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}

