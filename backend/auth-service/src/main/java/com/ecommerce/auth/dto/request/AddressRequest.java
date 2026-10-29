package com.ecommerce.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO để tạo mới hoặc cập nhật một địa chỉ trong sổ địa chỉ.
 */
@Getter
@Setter
public class AddressRequest {

    @NotBlank(message = "Tên người nhận không được để trống")
    @Size(max = 150, message = "Tên người nhận tối đa 150 ký tự")
    private String receiverName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(\\+84|0)[3-9]\\d{8}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    private String addressLine;

    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    @Size(max = 100, message = "Tên tỉnh/thành tối đa 100 ký tự")
    private String city;

    @Size(max = 100, message = "Tên quận/huyện tối đa 100 ký tự")
    private String district;

    @Size(max = 100, message = "Tên phường/xã tối đa 100 ký tự")
    private String ward;

    private Boolean isDefault = false;
}
