package com.ecommerce.order.dto.request;

import com.ecommerce.order.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.io.Serializable;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long userId;

    @NotBlank(message = "Tên người nhận không được để trống")
    private String receiverName;

    @NotBlank(message = "Số điện thoại nhận hàng không được để trống")
    @Pattern(regexp = "^(0|\\+84)[3|5|7|8|9][0-9]{8}$", message = "Số điện thoại không đúng định dạng Việt Nam")
    private String receiverPhone;

    @NotBlank(message = "Địa chỉ nhận hàng không được để trống")
    private String shippingAddress;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;

    /**
     * [Task ECOM-267] Danh sách sản phẩm mua hàng.
     * Có thể để trống khi đặt hàng từ giỏ (hệ thống sẽ tự động lấy các sản phẩm từ giỏ hàng của user).
     */
    @Valid
    private List<CheckoutItemRequest> items;
}
