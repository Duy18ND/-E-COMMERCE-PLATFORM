package com.ecommerce.order.controller;

import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-327] QA Test - Quản lý Thống kê: API, validation và quyền truy cập (ECOM-326)
 * Sprint: SPRINT 3
 * Feature cha: ECOM-320 (Quản lý khách hàng & Thống kê)
 * Scope kiểm thử: ECOM-326 (API thống kê doanh thu / đơn hàng thời gian thực)
 * QA Lead: NGÔ PHƯƠNG / Phối hợp Backend: TRẦN NGỌC LINH
 */
@WebMvcTest(AdminStatisticsController.class)
@DisplayName("[ECOM-327] QA Test - Quản lý Thống kê: API, validation và quyền truy cập (ECOM-326)")
public class AdminStatisticsApiQATest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    // =========================================================================
    // 1. Phân quyền và Bảo mật (RBAC & Authorization Tests)
    // =========================================================================
    @Nested
    @DisplayName("1. Kiểm tra Quyền truy cập & RBAC (ADMIN / USER / GUEST)")
    class AuthorizationAndRbacTests {

        @Test
        @DisplayName("[E327-18] ADMIN có header X-User-Roles chứa ROLE_ADMIN -> Cho phép truy cập thống kê (200 OK)")
        void getStatistics_AdminRole_Allowed() throws Exception {
            DashboardResponse mockStats = DashboardResponse.builder()
                    .totalOrders(10L)
                    .totalRevenue(new BigDecimal("25000000.00"))
                    .pendingOrders(2L)
                    .completedOrders(8L)
                    .cancelledOrders(0L)
                    .ordersByStatus(Map.of(OrderStatus.PENDING, 2L, OrderStatus.DELIVERED, 8L))
                    .lowStockProductsCount(1L)
                    .totalUsers(15L)
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(mockStats);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isMap());
        }

        @Test
        @DisplayName("[E327-19] USER thường (chỉ có ROLE_USER) -> Bị từ chối truy cập thống kê (403 Forbidden)")
        void getStatistics_UserRole_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này")));
        }

        @Test
        @DisplayName("[E327-20] GUEST không truyền token / không có header X-User-Roles -> Bị từ chối (403 Forbidden)")
        void getStatistics_GuestNoToken_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/statistics"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Chỉ tài khoản ADMIN mới có quyền")));
        }

        @Test
        @DisplayName("[E327-21] Header X-User-Roles rỗng hoặc không chứa ADMIN -> Bị từ chối (403 Forbidden)")
        void getStatistics_EmptyRoles_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "   "))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[E327-22] Header X-User-Roles chứa nhiều quyền kèm ROLE_ADMIN -> Cho phép truy cập (200 OK)")
        void getStatistics_MultipleRolesWithAdmin_Allowed() throws Exception {
            DashboardResponse mockStats = DashboardResponse.builder()
                    .totalOrders(5L)
                    .totalRevenue(new BigDecimal("12000000.00"))
                    .ordersByStatus(Map.of(OrderStatus.DELIVERED, 5L))
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(mockStats);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN, ROLE_STAFF"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    // =========================================================================
    // 2. Kiểm thử Cấu trúc Dữ liệu & Nghiệp vụ Thống kê (ECOM-326)
    // =========================================================================
    @Nested
    @DisplayName("2. Kiểm thử Cấu trúc Dữ liệu & Tính toán Thống kê (ECOM-326)")
    class StatisticsFunctionalTests {

        @Test
        @DisplayName("[E327-23] Dữ liệu thống kê chuẩn: Đúng cấu trúc, tổng doanh thu không âm, kiểu dữ liệu phù hợp")
        void getStatistics_ValidData_CorrectStructureAndTypes() throws Exception {
            Map<OrderStatus, Long> statusMap = new EnumMap<>(OrderStatus.class);
            for (OrderStatus s : OrderStatus.values()) {
                statusMap.put(s, 0L);
            }
            statusMap.put(OrderStatus.PENDING, 3L);
            statusMap.put(OrderStatus.PAID, 7L);
            statusMap.put(OrderStatus.DELIVERED, 25L);
            statusMap.put(OrderStatus.CANCELLED, 2L);

            DashboardResponse response = DashboardResponse.builder()
                    .totalOrders(37L)
                    .totalRevenue(new BigDecimal("185000000.50"))
                    .pendingOrders(3L)
                    .completedOrders(25L)
                    .cancelledOrders(2L)
                    .ordersByStatus(statusMap)
                    .lowStockProductsCount(4L)
                    .totalUsers(88L)
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(response);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Lấy báo cáo thống kê thành công"))
                    .andExpect(jsonPath("$.data.totalOrders").value(37))
                    .andExpect(jsonPath("$.data.totalRevenue").value(185000000.50))
                    .andExpect(jsonPath("$.data.pendingOrders").value(3))
                    .andExpect(jsonPath("$.data.completedOrders").value(25))
                    .andExpect(jsonPath("$.data.cancelledOrders").value(2))
                    .andExpect(jsonPath("$.data.lowStockProductsCount").value(4))
                    .andExpect(jsonPath("$.data.totalUsers").value(88))
                    .andExpect(jsonPath("$.data.ordersByStatus.PENDING").value(3))
                    .andExpect(jsonPath("$.data.ordersByStatus.DELIVERED").value(25))
                    .andExpect(jsonPath("$.data.ordersByStatus.CANCELLED").value(2));
        }

        @Test
        @DisplayName("[E327-24] Xác thực tổng doanh thu không bị âm (Non-negative Revenue)")
        void getStatistics_RevenueIsNonNegative() throws Exception {
            DashboardResponse response = DashboardResponse.builder()
                    .totalOrders(0L)
                    .totalRevenue(BigDecimal.ZERO)
                    .pendingOrders(0L)
                    .completedOrders(0L)
                    .cancelledOrders(0L)
                    .ordersByStatus(Map.of())
                    .lowStockProductsCount(0L)
                    .totalUsers(0L)
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(response);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalRevenue").value(greaterThanOrEqualTo(0)));
        }

        @Test
        @DisplayName("[E327-25] Số lượng sản phẩm sắp hết (lowStockProductsCount) có kiểu dữ liệu phù hợp (>= 0)")
        void getStatistics_LowStockCountIsValid() throws Exception {
            DashboardResponse response = DashboardResponse.builder()
                    .totalOrders(10L)
                    .totalRevenue(new BigDecimal("5000000"))
                    .lowStockProductsCount(5L)
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(response);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.lowStockProductsCount").value(5));
        }
    }

    // =========================================================================
    // 3. Kiểm thử Trường hợp Dữ liệu Trống & Biên (Empty & Edge Cases)
    // =========================================================================
    @Nested
    @DisplayName("3. Kiểm thử Trường hợp Dữ liệu Trống & Biên (Empty & Edge Cases)")
    class EmptyAndEdgeCaseDataTests {

        @Test
        @DisplayName("[E327-26] Khi hệ thống chưa có đơn hàng nào -> Phản hồi chuẩn (totalOrders=0, totalRevenue=0), không phát sinh lỗi 500")
        void getStatistics_EmptySystem_Returns200WithZeroValues() throws Exception {
            Map<OrderStatus, Long> zeroStatusMap = new EnumMap<>(OrderStatus.class);
            for (OrderStatus s : OrderStatus.values()) {
                zeroStatusMap.put(s, 0L);
            }

            DashboardResponse emptyResponse = DashboardResponse.builder()
                    .totalOrders(0L)
                    .totalRevenue(BigDecimal.ZERO)
                    .pendingOrders(0L)
                    .completedOrders(0L)
                    .cancelledOrders(0L)
                    .ordersByStatus(zeroStatusMap)
                    .lowStockProductsCount(0L)
                    .totalUsers(0L)
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(emptyResponse);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.totalOrders").value(0))
                    .andExpect(jsonPath("$.data.totalRevenue").value(0))
                    .andExpect(jsonPath("$.data.pendingOrders").value(0))
                    .andExpect(jsonPath("$.data.completedOrders").value(0))
                    .andExpect(jsonPath("$.data.cancelledOrders").value(0));
        }

        @Test
        @DisplayName("[E327-27] Khi chỉ có đơn hàng CANCELLED/PENDING (chưa có doanh thu) -> Doanh thu trả về 0.00 chính xác")
        void getStatistics_OnlyCancelledOrders_ZeroRevenue() throws Exception {
            DashboardResponse response = DashboardResponse.builder()
                    .totalOrders(5L)
                    .totalRevenue(BigDecimal.ZERO)
                    .pendingOrders(3L)
                    .completedOrders(0L)
                    .cancelledOrders(2L)
                    .ordersByStatus(Map.of(OrderStatus.PENDING, 3L, OrderStatus.CANCELLED, 2L))
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(response);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalOrders").value(5))
                    .andExpect(jsonPath("$.data.totalRevenue").value(0))
                    .andExpect(jsonPath("$.data.completedOrders").value(0));
        }
    }

    // =========================================================================
    // 4. Kiểm thử Bảo mật & Rò rỉ Dữ liệu (Security & Information Leakage)
    // =========================================================================
    @Nested
    @DisplayName("4. Kiểm tra Bảo vệ Thông tin Nhạy cảm & Error Response")
    class SecurityAndSensitiveDataTests {

        @Test
        @DisplayName("[E327-28] Response thống kê không để lộ password, hash hoặc thông tin người dùng nhạy cảm")
        void getStatistics_NoSensitiveDataExposed() throws Exception {
            DashboardResponse response = DashboardResponse.builder()
                    .totalOrders(100L)
                    .totalRevenue(new BigDecimal("500000000.00"))
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(response);

            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.password").doesNotExist())
                    .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                    .andExpect(jsonPath("$.data.token").doesNotExist())
                    .andExpect(jsonPath("$.data.secret").doesNotExist());
        }

        @Test
        @DisplayName("[E327-29] Phản hồi lỗi không để lộ SQL Query, Stack trace hoặc cấu hình máy chủ")
        void getStatistics_ErrorResponse_NoStackTraceOrSqlLeak() throws Exception {
            mockMvc.perform(get("/api/v1/admin/statistics")
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.stackTrace").doesNotExist())
                    .andExpect(jsonPath("$.trace").doesNotExist())
                    .andExpect(jsonPath("$.sql").doesNotExist());
        }
    }
}
