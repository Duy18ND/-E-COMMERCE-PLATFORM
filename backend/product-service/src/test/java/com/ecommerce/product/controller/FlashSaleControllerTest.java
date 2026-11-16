package com.ecommerce.product.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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

import com.ecommerce.product.dto.request.CreateFlashSaleCampaignRequest;
import com.ecommerce.product.dto.request.FlashSaleItemRequest;
import com.ecommerce.product.dto.response.FlashSaleCampaignResponse;
import com.ecommerce.product.exception.GlobalExceptionHandler;
import com.ecommerce.product.service.FlashSaleService;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
@DisplayName("FlashSaleController — Unit Tests")
class FlashSaleControllerTest {

    private MockMvc mockMvc;

    @Mock
    private FlashSaleService flashSaleService;

    @InjectMocks
    private FlashSaleController flashSaleController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(flashSaleController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/flash-sales/active trả về 200 OK công khai")
    void getActiveFlashSales_ShouldReturn200() throws Exception {
        FlashSaleCampaignResponse campaign = FlashSaleCampaignResponse.builder()
                .id(1L)
                .name("Flash Sale Công Nghệ")
                .status("ACTIVE")
                .items(List.of())
                .build();
        when(flashSaleService.getActiveCampaigns()).thenReturn(List.of(campaign));

        mockMvc.perform(get("/api/v1/flash-sales/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].name").value("Flash Sale Công Nghệ"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/flash-sales/campaigns trả về 201 Created khi có quyền ROLE_ADMIN")
    void createCampaign_AsAdmin_ShouldReturn201() throws Exception {
        CreateFlashSaleCampaignRequest request = CreateFlashSaleCampaignRequest.builder()
                .name("Sale Giờ Vàng")
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now().plusHours(2))
                .items(List.of(FlashSaleItemRequest.builder()
                        .productId(1L)
                        .flashSalePrice(new BigDecimal("499.00"))
                        .quantity(10)
                        .userLimit(2)
                        .build()))
                .build();

        FlashSaleCampaignResponse created = FlashSaleCampaignResponse.builder()
                .id(10L)
                .name("Sale Giờ Vàng")
                .status("ACTIVE")
                .build();
        when(flashSaleService.createCampaign(any())).thenReturn(created);

        mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                        .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10));
    }

    @Test
    @DisplayName("POST /api/v1/admin/flash-sales/campaigns trả về 403 Forbidden khi không có ROLE_ADMIN")
    void createCampaign_AsNonAdmin_ShouldReturn403() throws Exception {
        CreateFlashSaleCampaignRequest request = CreateFlashSaleCampaignRequest.builder()
                .name("Sale Trái Phép")
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now().plusHours(2))
                .items(List.of(FlashSaleItemRequest.builder()
                        .productId(1L)
                        .flashSalePrice(new BigDecimal("499.00"))
                        .quantity(10)
                        .userLimit(2)
                        .build()))
                .build();

        mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                        .header("X-User-Roles", "ROLE_USER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(flashSaleService, never()).createCampaign(any());
    }

    @Test
    @DisplayName("POST /api/v1/admin/flash-sales/campaigns trả về 400 Bad Request khi endTime <= startTime")
    void createCampaign_InvalidTimeRange_ShouldReturn400() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        CreateFlashSaleCampaignRequest invalidRequest = CreateFlashSaleCampaignRequest.builder()
                .name("Sale Ngược Giờ")
                .startTime(now.plusHours(3))
                .endTime(now.plusHours(1))
                .items(List.of(FlashSaleItemRequest.builder()
                        .productId(1L)
                        .flashSalePrice(new BigDecimal("499.00"))
                        .quantity(10)
                        .userLimit(2)
                        .build()))
                .build();

        mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(flashSaleService, never()).createCampaign(any());
    }

    @Test
    @DisplayName("PUT /api/v1/admin/flash-sales/campaigns/{id}/status cập nhật trạng thái thành công")
    void updateCampaignStatus_AsAdmin_ShouldReturn200() throws Exception {
        when(flashSaleService.updateCampaignStatus(eq(5L), eq("ENDED")))
                .thenReturn(FlashSaleCampaignResponse.builder().id(5L).status("ENDED").build());

        mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/5/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("status", "ENDED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ENDED"));
    }

    @Test
    @DisplayName("POST /api/v1/flash-sales/restore hoàn trả tồn kho Flash Sale thành công 200 OK")
    void restoreFlashSaleStock_ShouldReturn200() throws Exception {
        com.ecommerce.product.dto.request.FlashSaleReserveRequest request =
                new com.ecommerce.product.dto.request.FlashSaleReserveRequest(42L, 3);

        mockMvc.perform(post("/api/v1/flash-sales/restore")
                        .header("X-Internal-Service-Key", "ecommerce-internal-service-secret-2026")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(flashSaleService).restoreFlashSaleStock(42L, 3);
    }

    @Test
    @DisplayName("[Fix-C.1] POST /api/v1/flash-sales/reserve & restore chặn user thường (403 Forbidden)")
    void reserveAndRestoreFlashSaleStock_WithoutInternalKeyOrAdmin_ShouldReturn403() throws Exception {
        com.ecommerce.product.dto.request.FlashSaleReserveRequest request =
                new com.ecommerce.product.dto.request.FlashSaleReserveRequest(42L, 1);

        mockMvc.perform(post("/api/v1/flash-sales/reserve")
                        .header("X-User-Roles", "ROLE_USER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/flash-sales/restore")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(flashSaleService, never()).reserveFlashSaleStock(any(), any(Integer.class));
        verify(flashSaleService, never()).restoreFlashSaleStock(any(), any(Integer.class));
    }
}

