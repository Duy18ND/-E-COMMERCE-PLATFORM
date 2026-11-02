package com.ecommerce.auth.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.io.Serializable;

/**
 * [Task ECOM-128] DTO nhận thông tin cập nhật hồ sơ cá nhân và địa chỉ của khách hàng.
 * Phụ trách bởi: Đoàn Mạnh Duy
 * Cho phép khách cập nhật họ tên, số điện thoại và thông tin địa chỉ giao hàng.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
    private String fullName;

    @Pattern(regexp = "^(0|\\+84)[35789][0-9]{8}$", message = "Số điện thoại không đúng định dạng Việt Nam")
    private String phone;

    // Các trường cập nhật địa chỉ mặc định (tùy chọn)
    @Size(max = 255, message = "Địa chỉ chi tiết không được vượt quá 255 ký tự")
    private String addressLine;

    @Size(max = 100, message = "Tỉnh/Thành phố không được vượt quá 100 ký tự")
    private String city;

    @Size(max = 100, message = "Quận/Huyện không được vượt quá 100 ký tự")
    private String district;

    @Size(max = 100, message = "Phường/Xã không được vượt quá 100 ký tự")
    private String ward;
}

