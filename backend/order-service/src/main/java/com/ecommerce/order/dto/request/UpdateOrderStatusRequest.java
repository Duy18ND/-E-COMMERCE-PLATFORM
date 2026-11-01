package com.ecommerce.order.dto.request;

import com.ecommerce.order.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.io.Serializable;

/**
 * [Task ECOM-187 / ECOM-317] Request DTO để Admin cập nhật trạng thái đơn hàng.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
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

    /**
     * [Task ECOM-187] Ghi chú lý do chuyển trạng thái hoặc mã vận đơn.
     */
    private String note;

    public UpdateOrderStatusRequest(OrderStatus status) {
        this.status = status;
    }
}
