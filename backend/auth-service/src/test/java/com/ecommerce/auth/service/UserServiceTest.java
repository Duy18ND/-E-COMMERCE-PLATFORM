package com.ecommerce.auth.service;

import com.ecommerce.auth.dto.request.AddressRequest;
import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.AddressResponse;
import com.ecommerce.auth.dto.response.PagedResponse;
import com.ecommerce.auth.dto.response.UserSummaryResponse;
import com.ecommerce.auth.entity.Role;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.entity.UserAddress;
import com.ecommerce.auth.enums.RoleName;
import com.ecommerce.auth.enums.UserStatus;
import com.ecommerce.auth.exception.ResourceNotFoundException;
import com.ecommerce.auth.repository.UserAddressRepository;
import com.ecommerce.auth.repository.UserRepository;
import com.ecommerce.auth.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAddressRepository addressRepository;

    @InjectMocks
    private UserServiceImpl userService;

    private User sampleUser;
    private UserAddress sampleAddress;
    private AddressRequest sampleAddressRequest;

    @BeforeEach
    void setUp() {
        Role userRole = new Role(1L, RoleName.ROLE_USER);
        sampleUser = User.builder()
                .id(1L)
                .email("user@example.com")
                .fullName("Nguyen Van A")
                .phone("0987654321")
                .status(UserStatus.ACTIVE)
                .roles(Set.of(userRole))
                .build();

        sampleAddress = UserAddress.builder()
                .id(10L)
                .userId(1L)
                .receiverName("Nguyen Van A")
                .phone("0987654321")
                .addressLine("123 Duong ABC")
                .city("Ha Noi")
                .district("Cau Giay")
                .ward("Dich Vong")
                .isDefault(false)
                .build();

        sampleAddressRequest = new AddressRequest();
        sampleAddressRequest.setReceiverName("Nguyen Van A");
        sampleAddressRequest.setPhone("0987654321");
        sampleAddressRequest.setAddressLine("123 Duong ABC");
        sampleAddressRequest.setCity("Ha Noi");
        sampleAddressRequest.setDistrict("Cau Giay");
        sampleAddressRequest.setWard("Dich Vong");
        sampleAddressRequest.setIsDefault(false);
    }

    // ==============================================================
    // Address Book Unit Tests (Task 9)
    // ==============================================================

    @Test
    @DisplayName("Lấy danh sách địa chỉ của User theo thứ tự isDefault DESC")
    void getAddressesByUser_Success() {
        when(addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(1L))
                .thenReturn(List.of(sampleAddress));

        List<AddressResponse> result = userService.getAddressesByUser(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(10L);
        assertThat(result.get(0).getReceiverName()).isEqualTo("Nguyen Van A");
        verify(addressRepository, times(1)).findByUserIdOrderByIsDefaultDescCreatedAtDesc(1L);
    }

    @Test
    @DisplayName("Thêm địa chỉ mới với isDefault = true -> Gọi clearDefaultByUserId để bỏ cờ các địa chỉ cũ")
    void addAddress_WhenDefault_ShouldClearExistingDefaults() {
        sampleAddressRequest.setIsDefault(true);

        when(addressRepository.save(any(UserAddress.class))).thenAnswer(invocation -> {
            UserAddress saved = invocation.getArgument(0);
            saved.setId(11L);
            return saved;
        });

        AddressResponse response = userService.addAddress(1L, sampleAddressRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(11L);
        assertThat(response.getIsDefault()).isTrue();

        // Verify clearDefaultByUserId is called
        verify(addressRepository, times(1)).clearDefaultByUserId(1L);
        verify(addressRepository, times(1)).save(any(UserAddress.class));
    }

    @Test
    @DisplayName("Thêm địa chỉ mới với isDefault = false -> Không gọi clearDefaultByUserId")
    void addAddress_WhenNotDefault_ShouldNotClearExistingDefaults() {
        sampleAddressRequest.setIsDefault(false);

        when(addressRepository.save(any(UserAddress.class))).thenAnswer(invocation -> {
            UserAddress saved = invocation.getArgument(0);
            saved.setId(12L);
            return saved;
        });

        AddressResponse response = userService.addAddress(1L, sampleAddressRequest);

        assertThat(response).isNotNull();
        assertThat(response.getIsDefault()).isFalse();

        verify(addressRepository, never()).clearDefaultByUserId(any());
        verify(addressRepository, times(1)).save(any(UserAddress.class));
    }

    @Test
    @DisplayName("Cập nhật địa chỉ thành mặc định -> Gọi clearDefaultByUserId")
    void updateAddress_SettingToDefault_ShouldClearExistingDefaults() {
        sampleAddress.setIsDefault(false);
        sampleAddressRequest.setIsDefault(true);

        when(addressRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(sampleAddress));
        when(addressRepository.save(any(UserAddress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressResponse response = userService.updateAddress(1L, 10L, sampleAddressRequest);

        assertThat(response.getIsDefault()).isTrue();
        verify(addressRepository, times(1)).clearDefaultByUserId(1L);
        verify(addressRepository, times(1)).save(sampleAddress);
    }

    @Test
    @DisplayName("Cập nhật địa chỉ không tồn tại -> Ném ResourceNotFoundException")
    void updateAddress_NotFound_ShouldThrowResourceNotFoundException() {
        when(addressRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.updateAddress(1L, 99L, sampleAddressRequest)
        );

        verify(addressRepository, never()).save(any());
    }

    @Test
    @DisplayName("Xóa địa chỉ thành công")
    void deleteAddress_Success() {
        when(addressRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(sampleAddress));

        userService.deleteAddress(1L, 10L);

        verify(addressRepository, times(1)).delete(sampleAddress);
    }

    @Test
    @DisplayName("Xóa địa chỉ không tồn tại -> Ném ResourceNotFoundException")
    void deleteAddress_NotFound_ShouldThrowResourceNotFoundException() {
        when(addressRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.deleteAddress(1L, 99L)
        );

        verify(addressRepository, never()).delete(any());
    }

    // ==============================================================
    // Admin User Management Unit Tests (Task 11)
    // ==============================================================

    @Test
    @DisplayName("Admin: Lấy danh sách người dùng phân trang")
    void getAllUsers_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(List.of(sampleUser), pageable, 1);
        when(userRepository.findAll(eq(pageable))).thenReturn(page);

        PagedResponse<UserSummaryResponse> response = userService.getAllUsers(pageable);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getEmail()).isEqualTo("user@example.com");
        assertThat(response.getContent().get(0).getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(userRepository, times(1)).findAll(pageable);
    }

    @Test
    @DisplayName("Admin: Khóa tài khoản người dùng -> Cập nhật status thành BLOCKED")
    void updateUserStatus_BlockUser_Success() {
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserSummaryResponse response = userService.updateUserStatus(1L, request);

        assertThat(response.getStatus()).isEqualTo(UserStatus.BLOCKED);
        assertThat(sampleUser.getStatus()).isEqualTo(UserStatus.BLOCKED);
        verify(userRepository, times(1)).save(sampleUser);
    }

    @Test
    @DisplayName("Admin: Cập nhật status người dùng không tồn tại -> Ném ResourceNotFoundException")
    void updateUserStatus_UserNotFound_ShouldThrowResourceNotFoundException() {
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.updateUserStatus(999L, request)
        );

        verify(userRepository, never()).save(any());
    }
}
