package com.ecommerce.order.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplyVoucherRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotBlank(message = "Mã giảm giá không được để trống")
    @Size(max = 50, message = "Mã giảm giá không được vượt quá 50 ký tự")
    private String code;

    @NotNull(message = "Tổng tiền đơn hàng không được để trống")
    @DecimalMin(value = "0.00", inclusive = false, message = "Tổng tiền đơn hàng phải lớn hơn 0")
    private BigDecimal orderTotal;

    /**
     * [Task ECOM-167] ID người dùng áp mã (tùy chọn, được truyền từ header X-User-Id hoặc body để chặn dùng trùng).
     */
    private Long userId;

    public ApplyVoucherRequest(String code, BigDecimal orderTotal) {
        this.code = code;
        this.orderTotal = orderTotal;
    }
}

