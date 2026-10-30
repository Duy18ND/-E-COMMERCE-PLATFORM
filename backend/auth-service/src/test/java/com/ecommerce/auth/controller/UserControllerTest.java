package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.AddressRequest;
import com.ecommerce.auth.dto.request.UpdateProfileRequest;
import com.ecommerce.auth.dto.response.AddressResponse;
import com.ecommerce.auth.dto.response.UserProfileResponse;
import com.ecommerce.auth.enums.UserStatus;
import com.ecommerce.auth.exception.GlobalExceptionHandler;
import com.ecommerce.auth.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private AddressRequest sampleAddressRequest;
    private AddressResponse sampleAddressResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleAddressRequest = new AddressRequest();
        sampleAddressRequest.setReceiverName("Nguyen Van A");
        sampleAddressRequest.setPhone("0987654321");
        sampleAddressRequest.setAddressLine("123 Duong ABC");
        sampleAddressRequest.setCity("Ha Noi");
        sampleAddressRequest.setDistrict("Cau Giay");
        sampleAddressRequest.setWard("Dich Vong");
        sampleAddressRequest.setIsDefault(true);

        sampleAddressResponse = AddressResponse.builder()
                .id(1L)
                .userId(100L)
                .receiverName("Nguyen Van A")
                .phone("0987654321")
                .addressLine("123 Duong ABC")
                .city("Ha Noi")
                .district("Cau Giay")
                .ward("Dich Vong")
                .isDefault(true)
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/users/me/addresses: Có header X-User-Id -> 200 OK")
    void getMyAddresses_WithXUserId_Success() throws Exception {
        when(userService.getAddressesByUser(100L)).thenReturn(List.of(sampleAddressResponse));

        mockMvc.perform(get("/api/v1/users/me/addresses")
                        .header("X-User-Id", 100L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1L))
                .andExpect(jsonPath("$.data[0].receiverName").value("Nguyen Van A"));
    }

    @Test
    @DisplayName("GET /api/v1/users/me/addresses: Thiếu header X-User-Id -> 403 Forbidden")
    void getMyAddresses_MissingXUserId_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/users/me/addresses"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("POST /api/v1/users/me/addresses: Thêm địa chỉ mới -> 201 Created")
    void addAddress_Success() throws Exception {
        when(userService.addAddress(eq(100L), any(AddressRequest.class))).thenReturn(sampleAddressResponse);

        mockMvc.perform(post("/api/v1/users/me/addresses")
                        .header("X-User-Id", 100L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAddressRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1L))
                .andExpect(jsonPath("$.data.isDefault").value(true));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me/addresses/{id}: Cập nhật địa chỉ -> 200 OK")
    void updateAddress_Success() throws Exception {
        when(userService.updateAddress(eq(100L), eq(1L), any(AddressRequest.class))).thenReturn(sampleAddressResponse);

        mockMvc.perform(put("/api/v1/users/me/addresses/1")
                        .header("X-User-Id", 100L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAddressRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1L));
    }

    @Test
    @DisplayName("DELETE /api/v1/users/me/addresses/{id}: Xóa địa chỉ -> 200 OK")
    void deleteAddress_Success() throws Exception {
        doNothing().when(userService).deleteAddress(100L, 1L);

        mockMvc.perform(delete("/api/v1/users/me/addresses/1")
                        .header("X-User-Id", 100L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // =========================================================================
    // [Task ECOM-128] Unit Tests cho API Xem và Cập nhật hồ sơ cá nhân
    // =========================================================================

    @Test
    @DisplayName("[ECOM-128] GET /api/v1/users/profile: Lấy hồ sơ người dùng thành công")
    void getProfile_Success() throws Exception {
        UserProfileResponse profileResponse = UserProfileResponse.builder()
                .id(100L)
                .email("duy@example.com")
                .fullName("Đoàn Mạnh Duy")
                .phone("0987654321")
                .status(UserStatus.ACTIVE)
                .build();

        when(userService.getProfile(100L)).thenReturn(profileResponse);

        mockMvc.perform(get("/api/v1/users/profile")
                        .header("X-User-Id", 100L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(100L))
                .andExpect(jsonPath("$.data.email").value("duy@example.com"))
                .andExpect(jsonPath("$.data.fullName").value("Đoàn Mạnh Duy"));
    }

    @Test
    @DisplayName("[ECOM-128] PUT /api/v1/users/profile: Cập nhật thông tin cá nhân và địa chỉ thành công")
    void updateProfile_Success() throws Exception {
        UpdateProfileRequest updateRequest = UpdateProfileRequest.builder()
                .fullName("Đoàn Mạnh Duy Updated")
                .phone("0912345678")
                .addressLine("456 Cầu Giấy")
                .city("Hà Nội")
                .build();

        UserProfileResponse updatedProfile = UserProfileResponse.builder()
                .id(100L)
                .email("duy@example.com")
                .fullName("Đoàn Mạnh Duy Updated")
                .phone("0912345678")
                .status(UserStatus.ACTIVE)
                .build();

        when(userService.updateProfile(eq(100L), any(UpdateProfileRequest.class))).thenReturn(updatedProfile);

        mockMvc.perform(put("/api/v1/users/profile")
                        .header("X-User-Id", 100L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Đoàn Mạnh Duy Updated"))
                .andExpect(jsonPath("$.data.phone").value("0912345678"));
    }
}
