package com.ecommerce.auth.dto.response;

import com.ecommerce.auth.enums.UserStatus;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * [Task ECOM-128] DTO trả về thông tin hồ sơ người dùng (User Profile).
 * Phụ trách bởi: Đoàn Mạnh Duy
 * Bao gồm thông tin cá nhân, số điện thoại, vai trò và địa chỉ nhận hàng của khách hàng.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private UserStatus status;
    private Set<String> roles;
    private AddressResponse defaultAddress;
    private List<AddressResponse> addresses;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

