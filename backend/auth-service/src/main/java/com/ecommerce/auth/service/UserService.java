package com.ecommerce.auth.service;

import com.ecommerce.auth.dto.request.AddressRequest;
import com.ecommerce.auth.dto.request.UpdateProfileRequest;
import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.AddressResponse;
import com.ecommerce.auth.dto.response.PagedResponse;
import com.ecommerce.auth.dto.response.UserProfileResponse;
import com.ecommerce.auth.dto.response.UserSummaryResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserService {

    // ── Profile & Address (User scope - Task ECOM-128) ─────────────────────────

    /**
     * [Task ECOM-128] Lấy thông tin cá nhân và sổ địa chỉ của khách hàng.
     */
    UserProfileResponse getProfile(Long userId);

    /**
     * [Task ECOM-128] Cập nhật thông tin cá nhân (họ tên, sđt) và địa chỉ nhận hàng của khách.
     */
    UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request);

    List<AddressResponse> getAddressesByUser(Long userId);

    AddressResponse addAddress(Long userId, AddressRequest request);

    AddressResponse updateAddress(Long userId, Long addressId, AddressRequest request);

    void deleteAddress(Long userId, Long addressId);

    // ?? Admin scope ????????????????????????????????????????????????????????????

    PagedResponse<UserSummaryResponse> getAllUsers(Pageable pageable);

    UserSummaryResponse updateUserStatus(Long targetUserId, UpdateUserStatusRequest request);
}
