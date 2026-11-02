package com.ecommerce.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request DTO phục vụ API giả lập / xác nhận thanh toán đơn hàng.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MockPaymentRequest {

    @NotNull(message = "Trạng thái giả lập thanh toán (success) không được để trống")
    private Boolean success;

    @Size(max = 255, message = "Ghi chú thanh toán không được vượt quá 255 ký tự")
    private String note;
}

