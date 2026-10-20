package com.re.backend.payment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MockPayRequest {

    @NotNull(message = "Trường success không được để trống")
    private Boolean success;
}
