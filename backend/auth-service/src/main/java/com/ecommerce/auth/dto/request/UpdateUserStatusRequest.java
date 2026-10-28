package com.ecommerce.auth.dto.request;

import com.ecommerce.auth.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO cho Admin cập nhật trạng thái tài khoản user (ACTIVE / BLOCKED).
 */
@Getter
@Setter
public class UpdateUserStatusRequest {

    @NotNull(message = "status không được để trống (ACTIVE hoặc BLOCKED)")
    private UserStatus status;
}
