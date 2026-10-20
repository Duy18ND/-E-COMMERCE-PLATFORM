package com.re.backend.order;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateOrderStatusRequest {

    @NotNull(message = "Trạng thái không được để trống")
    private OrderStatus status;
}
