package com.ecommerce.order.dto.request;

import com.ecommerce.order.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.io.Serializable;

/**
 * Request DTO để Admin cập nhật trạng thái đơn hàng.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOrderStatusRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotNull(message = "Trạng thái đơn hàng không được để trống")
    private OrderStatus status;
}
