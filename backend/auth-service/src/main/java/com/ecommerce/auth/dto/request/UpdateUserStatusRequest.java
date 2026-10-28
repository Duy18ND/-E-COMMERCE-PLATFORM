package com.ecommerce.auth.dto.request;

import com.ecommerce.auth.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO cho Admin c?p nh?t tr?ng thái tài kho?n user (ACTIVE / BLOCKED).
 */
@Getter
@Setter
public class UpdateUserStatusRequest {

    @NotNull(message = "status không ðý?c ð? tr?ng (ACTIVE ho?c BLOCKED)")
    private UserStatus status;
}
