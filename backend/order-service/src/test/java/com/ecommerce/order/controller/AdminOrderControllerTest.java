package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.UpdateOrderStatusRequest;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.PagedResponse;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminOrderController.class)
class AdminOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    // ==============================================================
    // RBAC & Authorization Tests (Header X-User-Roles must have ROLE_ADMIN)
    // ==============================================================

    @Test
    @DisplayName("Admin Order APIs: Thiếu header X-User-Roles -> Trả về 403 Forbidden")
    void adminApis_MissingXUserRolesHeader_ShouldReturn403() throws Exception {
        // GET /api/v1/admin/orders
        mockMvc.perform(get("/api/v1/admin/orders"))
                .andExpect(status().isForbidden());

        // PUT /api/v1/admin/orders/1/status
        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
        mockMvc.perform(put("/api/v1/admin/orders/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // GET /api/v1/admin/orders/statistics
        mockMvc.perform(get("/api/v1/admin/orders/statistics"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin Order APIs: Header X-User-Roles không chứa ROLE_ADMIN -> Trả về 403 Forbidden")
    void adminApis_NotRoleAdmin_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden());

        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
        mockMvc.perform(put("/api/v1/admin/orders/1/status")
                        .header("X-User-Roles", "ROLE_USER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/orders/statistics")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden());
    }

    // ==============================================================
    // Functional Controller Tests with ROLE_ADMIN
    // ==============================================================

    @Test
    @DisplayName("GET /api/v1/admin/orders: Với ROLE_ADMIN -> Trả về 200 OK kèm danh sách phân trang")
    void getAllOrders_AdminRole_Success() throws Exception {
        OrderResponse orderResponse = OrderResponse.builder()
                .id(1L)
                .userId(10L)
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("500000"))
                .build();

        PagedResponse<OrderResponse> pagedResponse = PagedResponse.<OrderResponse>builder()
                .content(List.of(orderResponse))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(1L)
                .totalPages(1)
                .last(true)
                .build();

        when(orderService.getAllOrders(eq(OrderStatus.PENDING), any(Pageable.class))).thenReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/admin/orders")
                        .header("X-User-Roles", "ROLE_ADMIN,ROLE_USER")
                        .param("status", "PENDING")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(1L))
                .andExpect(jsonPath("$.data.content[0].status").value("PENDING"));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/orders/{id}/status: Cập nhật trạng thái thành công với ROLE_ADMIN")
    void updateOrderStatus_AdminRole_Success() throws Exception {
        UpdateOrderStatusRequest request = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);

        OrderResponse orderResponse = OrderResponse.builder()
                .id(1L)
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("500000"))
                .build();

        when(orderService.updateOrderStatus(eq(1L), eq(OrderStatus.CONFIRMED), any(), any(), any())).thenReturn(orderResponse);

        mockMvc.perform(put("/api/v1/admin/orders/1/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("[ECOM-187] PUT /api/v1/admin/orders/{id}/status: Ghi chú vượt quá 1000 ký tự -> Trả về 400 Bad Request")
    void updateOrderStatus_WhenNoteExceeds1000Chars_ShouldReturn400() throws Exception {
        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.CONFIRMED)
                .note("A".repeat(1001))
                .build();

        mockMvc.perform(put("/api/v1/admin/orders/1/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Ghi chú không được vượt quá 1000 ký tự")));
    }

    @Test
    @DisplayName("[ECOM-315] GET /api/v1/admin/orders/{id}/history: Lấy lịch sử trạng thái thành công với ROLE_ADMIN")
    void getOrderStatusHistory_AdminRole_Success() throws Exception {
        com.ecommerce.order.dto.response.OrderStatusHistoryResponse history = com.ecommerce.order.dto.response.OrderStatusHistoryResponse.builder()
                .id(1L)
                .orderId(1L)
                .status(OrderStatus.CONFIRMED)
                .statusDescription("Đơn hàng đã được xác nhận")
                .updatedBy("ADMIN:1")
                .actorRole("ROLE_ADMIN")
                .build();

        when(orderService.getOrderStatusHistory(eq(1L), any(), eq("ROLE_ADMIN"))).thenReturn(List.of(history));

        mockMvc.perform(get("/api/v1/admin/orders/1/history")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data[0].updatedBy").value("ADMIN:1"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/orders/statistics: Lấy thống kê dashboard thành công với ROLE_ADMIN")
    void getOrderStatistics_AdminRole_Success() throws Exception {
        DashboardResponse dashboardResponse = DashboardResponse.builder()
                .totalOrders(30L)
                .totalRevenue(new BigDecimal("25000000.00"))
                .ordersByStatus(Map.of(
                        OrderStatus.PENDING, 5L,
                        OrderStatus.DELIVERED, 20L,
                        OrderStatus.CANCELLED, 5L
                ))
                .build();

        when(orderService.getOrderStatistics()).thenReturn(dashboardResponse);

        mockMvc.perform(get("/api/v1/admin/orders/statistics")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalOrders").value(30))
                .andExpect(jsonPath("$.data.totalRevenue").value(25000000.00))
                .andExpect(jsonPath("$.data.ordersByStatus.PENDING").value(5))
                .andExpect(jsonPath("$.data.ordersByStatus.DELIVERED").value(20));
    }

    @Test
    @DisplayName("[ECOM-143 / ECOM-145] GET /api/v1/admin/orders/customer/{userId}: Admin xem lịch sử mua hàng của khách hàng thành công")
    void getOrdersByCustomer_AdminRole_Success() throws Exception {
        com.ecommerce.order.dto.response.OrderResponse order = com.ecommerce.order.dto.response.OrderResponse.builder()
                .id(101L)
                .userId(55L)
                .totalAmount(new BigDecimal("450000.00"))
                .status(OrderStatus.DELIVERED)
                .build();

        when(orderService.getOrdersByUserId(eq(55L), any(), eq("ROLE_ADMIN"))).thenReturn(List.of(order));

        mockMvc.perform(get("/api/v1/admin/orders/customer/55")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(101))
                .andExpect(jsonPath("$.data[0].userId").value(55))
                .andExpect(jsonPath("$.data[0].status").value("DELIVERED"));
    }

    @Test
    @DisplayName("[ECOM-143 / ECOM-145] GET /api/v1/admin/orders/customer/{userId}: Người dùng không có ROLE_ADMIN bị chặn 403")
    void getOrdersByCustomer_NonAdmin_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders/customer/55")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[Fix-4] GET /api/v1/admin/orders với sortBy không hợp lệ -> 400 Bad Request thay vì 500")
    void getAllOrders_WithInvalidSortBy_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("sortBy", "nonExistentField"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("sortBy")));

        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("GET /api/v1/admin/orders/stats: Alias tương thích FE trả về 200 OK với ROLE_ADMIN và 403 khi thiếu quyền")
    void getOrderStatsAlias_SuccessAndRbac() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders/stats")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden());

        DashboardResponse dashboardResponse = DashboardResponse.builder()
                .totalOrders(12L)
                .totalRevenue(new BigDecimal("1200000.00"))
                .build();
        when(orderService.getOrderStatistics()).thenReturn(dashboardResponse);

        mockMvc.perform(get("/api/v1/admin/orders/stats")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalOrders").value(12));
    }
}
