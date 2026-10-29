package com.ecommerce.auth.service.impl;

import com.ecommerce.auth.dto.request.AddressRequest;
import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.AddressResponse;
import com.ecommerce.auth.dto.response.PagedResponse;
import com.ecommerce.auth.dto.response.UserSummaryResponse;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.entity.UserAddress;
import com.ecommerce.auth.exception.ResourceNotFoundException;
import com.ecommerce.auth.repository.UserAddressRepository;
import com.ecommerce.auth.repository.UserRepository;
import com.ecommerce.auth.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserAddressRepository addressRepository;

    // Address CRUD

    @Override
    @Transactional(readOnly = true)
    public List<AddressResponse> getAddressesByUser(Long userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                .stream()
                .map(this::mapToAddressResponse)
                .toList();
    }

    @Override
    @Transactional
    public AddressResponse addAddress(Long userId, AddressRequest request) {
        log.info("Adding address for userId={}, isDefault={}", userId, request.getIsDefault());

        // Nếu địa chỉ mới là mặc định -> bỏ mặc định tất cả địa chỉ cũ trước
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            addressRepository.clearDefaultByUserId(userId);
            log.info("Cleared default flag for all addresses of userId={}", userId);
        }

        UserAddress address = UserAddress.builder()
                .userId(userId)
                .receiverName(request.getReceiverName())
                .phone(request.getPhone())
                .addressLine(request.getAddressLine())
                .city(request.getCity())
                .district(request.getDistrict())
                .ward(request.getWard())
                .isDefault(Boolean.TRUE.equals(request.getIsDefault()))
                .build();

        UserAddress saved = addressRepository.save(address);
        log.info("Address id={} saved for userId={}", saved.getId(), userId);
        return mapToAddressResponse(saved);
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(Long userId, Long addressId, AddressRequest request) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy địa chỉ ID " + addressId + " của user " + userId));

        // Nếu đặt làm mặc định -> bỏ flag của các địa chỉ khác
        if (Boolean.TRUE.equals(request.getIsDefault()) && !Boolean.TRUE.equals(address.getIsDefault())) {
            addressRepository.clearDefaultByUserId(userId);
        }

        address.setReceiverName(request.getReceiverName());
        address.setPhone(request.getPhone());
        address.setAddressLine(request.getAddressLine());
        address.setCity(request.getCity());
        address.setDistrict(request.getDistrict());
        address.setWard(request.getWard());
        address.setIsDefault(Boolean.TRUE.equals(request.getIsDefault()));

        return mapToAddressResponse(addressRepository.save(address));
    }

    @Override
    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy địa chỉ ID " + addressId + " của user " + userId));

        addressRepository.delete(address);
        log.info("Address id={} deleted for userId={}", addressId, userId);
    }

    // Admin: User management

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<UserSummaryResponse> getAllUsers(Pageable pageable) {
        Page<User> userPage = userRepository.findAll(pageable);
        Page<UserSummaryResponse> responsePage = userPage.map(this::mapToUserSummary);
        return PagedResponse.fromPage(responsePage);
    }

    @Override
    @Transactional
    public UserSummaryResponse updateUserStatus(Long targetUserId, UpdateUserStatusRequest request) {
        log.info("Admin updating status of userId={} to {}", targetUserId, request.getStatus());

        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy người dùng với ID: " + targetUserId));

        user.setStatus(request.getStatus());
        User updated = userRepository.save(user);
        log.info("User userId={} status updated to {}", targetUserId, updated.getStatus());
        return mapToUserSummary(updated);
    }

    // Mappers

    private AddressResponse mapToAddressResponse(UserAddress a) {
        return AddressResponse.builder()
                .id(a.getId())
                .userId(a.getUserId())
                .receiverName(a.getReceiverName())
                .phone(a.getPhone())
                .addressLine(a.getAddressLine())
                .city(a.getCity())
                .district(a.getDistrict())
                .ward(a.getWard())
                .isDefault(a.getIsDefault())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    private UserSummaryResponse mapToUserSummary(User u) {
        return UserSummaryResponse.builder()
                .id(u.getId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phone(u.getPhone())
                .status(u.getStatus())
                .roles(u.getRoles().stream().map(r -> r.getName().name()).toList())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
