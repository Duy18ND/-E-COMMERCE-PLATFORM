package com.ecommerce.order.controller;

import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-145 / ECOM-326] Unit test cho AdminStatisticsController.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@WebMvcTest(AdminStatisticsController.class)
class AdminStatisticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    @DisplayName("[ECOM-326] GET /api/v1/admin/statistics: Thiếu header X-User-Roles -> Trả về 403 Forbidden")
    void getStatistics_MissingRoles_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/statistics"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[ECOM-326] GET /api/v1/admin/statistics: Header X-User-Roles không phải ROLE_ADMIN -> Trả về 403")
    void getStatistics_NonAdminRole_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/statistics")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[ECOM-145 / ECOM-326] GET /api/v1/admin/statistics: Có quyền ROLE_ADMIN -> Trả về báo cáo thống kê 200 OK")
    void getStatistics_AdminRole_Success() throws Exception {
        DashboardResponse dashboardResponse = DashboardResponse.builder()
                .totalOrders(50L)
                .totalRevenue(new BigDecimal("100000000.00"))
                .pendingOrders(5L)
                .completedOrders(40L)
                .cancelledOrders(5L)
                .ordersByStatus(Map.of(
                        OrderStatus.PENDING, 5L,
                        OrderStatus.DELIVERED, 40L,
                        OrderStatus.CANCELLED, 5L
                ))
                .build();

        when(orderService.getOrderStatistics()).thenReturn(dashboardResponse);

        mockMvc.perform(get("/api/v1/admin/statistics")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalOrders").value(50))
                .andExpect(jsonPath("$.data.totalRevenue").value(100000000.00))
                .andExpect(jsonPath("$.data.pendingOrders").value(5))
                .andExpect(jsonPath("$.data.completedOrders").value(40));
    }

    @Test
    @DisplayName("[ECOM-326] Chống leo thang đặc quyền: ROLE_ADMIN_VIEWER bị từ chối với 403 Forbidden")
    void getStatistics_SubstringRoleBypass_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/statistics")
                        .header("X-User-Roles", "ROLE_ADMIN_VIEWER"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[ECOM-145 / ECOM-326] Lọc thống kê theo khoảng ngày hợp lệ (startDate <= endDate) -> Trả về 200 OK kèm lowStockProductsCount & totalUsers")
    void getStatistics_WithValidDateRange_ShouldReturn200() throws Exception {
        DashboardResponse filteredResponse = DashboardResponse.builder()
                .totalOrders(12L)
                .totalRevenue(new BigDecimal("25000000.00"))
                .pendingOrders(2L)
                .completedOrders(9L)
                .cancelledOrders(1L)
                .lowStockProductsCount(4L)
                .totalUsers(120L)
                .ordersByStatus(Map.of(OrderStatus.DELIVERED, 9L))
                .build();

        when(orderService.getOrderStatistics(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(filteredResponse);

        mockMvc.perform(get("/api/v1/admin/statistics")
                        .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN")
                        .param("startDate", "2026-10-01")
                        .param("endDate", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalOrders").value(12))
                .andExpect(jsonPath("$.data.lowStockProductsCount").value(4))
                .andExpect(jsonPath("$.data.totalUsers").value(120));
    }

    @Test
    @DisplayName("[ECOM-326] Lọc thống kê với startDate > endDate -> Trả về 400 Bad Request")
    void getStatistics_StartDateAfterEndDate_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/statistics")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("startDate", "2026-11-10")
                        .param("endDate", "2026-11-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("[ECOM-326] Truyền định dạng ngày không hợp lệ -> Trả về 400 Bad Request thay vì 500")
    void getStatistics_InvalidDateFormat_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/statistics")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("startDate", "not-a-date"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}

