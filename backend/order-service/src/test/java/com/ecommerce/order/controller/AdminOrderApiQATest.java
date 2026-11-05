package com.ecommerce.order.controller;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.StockReservationItem;
import com.ecommerce.order.dto.request.UpdateOrderStatusRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.OrderStatusHistoryResponse;
import com.ecommerce.order.dto.response.PagedResponse;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-296] QA Test - Quản trị đơn hàng: API, validation và quyền truy cập
 * Sprint: Sprint 2
 * Epic: ECOM-289 ([BE] Quản trị đơn hàng)
 * Feature cha: ECOM-140 (Quản trị đơn hàng - Manage Orders)
 * PIC: Ngô Phương / Hỗ trợ: Trần Ngọc Linh
 */
@WebMvcTest(AdminOrderController.class)
@DisplayName("[ECOM-296] QA Test - Quản trị đơn hàng: API, validation và quyền truy cập")
public class AdminOrderApiQATest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    @MockBean
    private ProductClient productClient;

    // =========================================================================
    // 1. KIỂM THỬ PHÂN QUYỀN TRUY CẬP (RBAC & SECURITY DEFENSE-IN-DEPTH)
    // =========================================================================

    @Nested
    @DisplayName("1. Phân quyền và Bảo mật (RBAC & Header X-User-Roles)")
    class RbacAndSecurityTests {

        @Test
        @DisplayName("TC-296-SEC-01: Guest truy cập GET /api/v1/admin/orders không có header -> 403 Forbidden")
        void testGetAllOrders_MissingRolesHeader_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/orders"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Chỉ tài khoản ADMIN mới có quyền")));
        }

        @Test
        @DisplayName("TC-296-SEC-02: Guest truy cập PUT /api/v1/admin/orders/1/status không có header -> 403 Forbidden")
        void testUpdateOrderStatus_MissingRolesHeader_Forbidden() throws Exception {
            UpdateOrderStatusRequest req = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-296-SEC-03: Guest truy cập GET /api/v1/admin/orders/1/history không có header -> 403 Forbidden")
        void testGetOrderHistory_MissingRolesHeader_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/orders/1/history"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-296-SEC-04: Guest truy cập GET /api/v1/admin/orders/statistics không có header -> 403 Forbidden")
        void testGetOrderStatistics_MissingRolesHeader_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/orders/statistics"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-296-SEC-05: User thông thường (ROLE_USER) gọi API Admin -> Bị chặn 403 Forbidden")
        void testAdminApis_UserRole_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value(containsString("Chỉ tài khoản ADMIN mới có quyền")));

            UpdateOrderStatusRequest req = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);
            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .header("X-User-Roles", "ROLE_USER")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-296-SEC-06: Chống tấn công Bypass Role giả mạo / Substring (ROLE_ADMIN_VIEWER, ROLE_ADMINISTRATOR) -> 403 Forbidden")
        void testAdminApis_SubstringBypassRoles_Forbidden() throws Exception {
            // ROLE_ADMIN_VIEWER không phải ROLE_ADMIN
            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "ROLE_ADMIN_VIEWER"))
                    .andExpect(status().isForbidden());

            // ROLE_ADMINISTRATOR không phải ROLE_ADMIN
            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "ROLE_ADMINISTRATOR"))
                    .andExpect(status().isForbidden());

            // FAKE_ROLE_ADMIN không phải ROLE_ADMIN
            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "FAKE_ROLE_ADMIN"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("TC-296-SEC-07: Đa vai trò hợp lệ (ROLE_USER,ROLE_ADMIN hoặc có khoảng trắng) -> Được cấp quyền 200 OK")
        void testAdminApis_MultiRoleWithRoleAdmin_Success() throws Exception {
            PagedResponse<OrderResponse> paged = PagedResponse.<OrderResponse>builder()
                    .content(List.of())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0)
                    .totalPages(0)
                    .last(true)
                    .build();

            when(orderService.getAllOrders(isNull(), any(Pageable.class))).thenReturn(paged);

            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    // =========================================================================
    // 2. KIỂM THỬ API LẤY DANH SÁCH ĐƠN HÀNG (GET /api/v1/admin/orders)
    // =========================================================================

    @Nested
    @DisplayName("2. API Danh sách đơn hàng toàn hệ thống")
    class OrderListingTests {

        @Test
        @DisplayName("TC-296-LIST-01: Lấy danh sách không lọc status -> Gọi orderService.getAllOrders(null, pageable)")
        void testGetAllOrders_NoFilter_Success() throws Exception {
            OrderResponse order = OrderResponse.builder()
                    .id(101L)
                    .userId(201L)
                    .receiverName("Nguyễn Văn A")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Lê Lợi, Hà Nội")
                    .totalAmount(new BigDecimal("1500000"))
                    .status(OrderStatus.PENDING)
                    .build();

            PagedResponse<OrderResponse> pagedResponse = PagedResponse.<OrderResponse>builder()
                    .content(List.of(order))
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(1)
                    .totalPages(1)
                    .last(true)
                    .build();

            when(orderService.getAllOrders(isNull(), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("page", "0")
                            .param("size", "10")
                            .param("sortBy", "id")
                            .param("sortDir", "desc"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content[0].id").value(101L))
                    .andExpect(jsonPath("$.data.content[0].receiverName").value("Nguyễn Văn A"))
                    .andExpect(jsonPath("$.data.content[0].totalAmount").value(1500000))
                    .andExpect(jsonPath("$.data.content[0].status").value("PENDING"));

            verify(orderService, times(1)).getAllOrders(isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("TC-296-LIST-02: Lọc đơn hàng theo trạng thái PENDING -> Truyền đúng OrderStatus.PENDING")
        void testGetAllOrders_FilterByPending_Success() throws Exception {
            OrderResponse order = OrderResponse.builder()
                    .id(102L)
                    .status(OrderStatus.PENDING)
                    .totalAmount(new BigDecimal("800000"))
                    .build();

            PagedResponse<OrderResponse> pagedResponse = PagedResponse.<OrderResponse>builder()
                    .content(List.of(order))
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(1)
                    .totalPages(1)
                    .last(true)
                    .build();

            when(orderService.getAllOrders(eq(OrderStatus.PENDING), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("status", "PENDING"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content[0].status").value("PENDING"));

            verify(orderService, times(1)).getAllOrders(eq(OrderStatus.PENDING), any(Pageable.class));
        }

        @Test
        @DisplayName("TC-296-LIST-03: Kiểm tra tham số sắp xếp và phân trang hợp lệ")
        void testGetAllOrders_PaginationAndSorting_Success() throws Exception {
            PagedResponse<OrderResponse> emptyPaged = PagedResponse.<OrderResponse>builder()
                    .content(List.of())
                    .pageNumber(2)
                    .pageSize(5)
                    .totalElements(12)
                    .totalPages(3)
                    .last(true)
                    .build();

            when(orderService.getAllOrders(any(), any(Pageable.class))).thenReturn(emptyPaged);

            mockMvc.perform(get("/api/v1/admin/orders")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("page", "2")
                            .param("size", "5")
                            .param("sortBy", "createdAt")
                            .param("sortDir", "asc"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.pageNumber").value(2))
                    .andExpect(jsonPath("$.data.pageSize").value(5))
                    .andExpect(jsonPath("$.data.totalPages").value(3));
        }
    }

    // =========================================================================
    // 3. KIỂM THỬ API CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (PUT /api/v1/admin/orders/{id}/status)
    // =========================================================================

    @Nested
    @DisplayName("3. API Cập nhật trạng thái đơn hàng & State Machine")
    class UpdateOrderStatusTests {

        @Test
        @DisplayName("TC-296-STATE-01: Admin duyệt đơn PENDING -> CONFIRMED thành công")
        void testUpdateOrderStatus_PendingToConfirmed_Success() throws Exception {
            UpdateOrderStatusRequest req = UpdateOrderStatusRequest.builder()
                    .status(OrderStatus.CONFIRMED)
                    .note("Quản trị viên đã duyệt đơn hàng")
                    .build();

            OrderResponse response = OrderResponse.builder()
                    .id(1L)
                    .status(OrderStatus.CONFIRMED)
                    .build();

            when(orderService.updateOrderStatus(eq(1L), eq(OrderStatus.CONFIRMED), eq("ADMIN:5"), eq("ROLE_ADMIN"), eq("Quản trị viên đã duyệt đơn hàng")))
                    .thenReturn(response);

            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .header("X-User-Id", "5")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Cập nhật trạng thái đơn hàng thành công"))
                    .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
        }

        @Test
        @DisplayName("TC-296-STATE-02: Không truyền X-User-Id -> updatedBy mặc định là 'ADMIN'")
        void testUpdateOrderStatus_NoUserIdHeader_DefaultAdmin() throws Exception {
            UpdateOrderStatusRequest req = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);

            OrderResponse response = OrderResponse.builder()
                    .id(1L)
                    .status(OrderStatus.CONFIRMED)
                    .build();

            when(orderService.updateOrderStatus(eq(1L), eq(OrderStatus.CONFIRMED), eq("ADMIN"), eq("ROLE_ADMIN"), isNull()))
                    .thenReturn(response);

            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("TC-296-STATE-03: Cập nhật đơn hàng không tồn tại -> 404 Not Found (ResourceNotFoundException)")
        void testUpdateOrderStatus_OrderNotFound_ShouldReturn404() throws Exception {
            UpdateOrderStatusRequest req = new UpdateOrderStatusRequest(OrderStatus.CONFIRMED);

            when(orderService.updateOrderStatus(eq(999999L), any(), any(), any(), any()))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: 999999"));

            mockMvc.perform(put("/api/v1/admin/orders/999999/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Không tìm thấy đơn hàng")));
        }

        @Test
        @DisplayName("TC-296-STATE-04: Chuyển trạng thái sai quy trình (Illegal State Transition) -> 400 Bad Request")
        void testUpdateOrderStatus_IllegalTransition_ShouldReturn400() throws Exception {
            UpdateOrderStatusRequest req = new UpdateOrderStatusRequest(OrderStatus.PENDING);

            when(orderService.updateOrderStatus(eq(1L), eq(OrderStatus.PENDING), any(), any(), any()))
                    .thenThrow(new IllegalStateException("Không thể chuyển trạng thái đơn hàng từ DELIVERED sang PENDING"));

            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Không thể chuyển trạng thái")));
        }
    }

    // =========================================================================
    // 4. KIỂM THỬ VALIDATION VÀ CASE DỮ LIỆU SAI (EDGE CASES)
    // =========================================================================

    @Nested
    @DisplayName("4. Validation dữ liệu & Ràng buộc DTO")
    class ValidationAndEdgeCasesTests {

        @Test
        @DisplayName("TC-296-VAL-01: Thiếu trường status (status = null) -> 400 Bad Request kèm message lỗi")
        void testUpdateOrderStatus_NullStatus_BadRequest() throws Exception {
            String invalidJson = "{\"status\": null, \"note\": \"Ghi chú hợp lệ\"}";

            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidJson))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Trạng thái đơn hàng không được để trống")));
        }

        @Test
        @DisplayName("TC-296-VAL-02: Trường status có giá trị enum sai (ví dụ: 'INVALID_STATUS') -> 400 Bad Request")
        void testUpdateOrderStatus_InvalidEnumValue_BadRequest() throws Exception {
            String invalidJson = "{\"status\": \"INVALID_STATUS\"}";

            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidJson))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("TC-296-VAL-03: Ghi chú note vượt quá 1000 ký tự -> 400 Bad Request")
        void testUpdateOrderStatus_NoteExceeds1000Chars_BadRequest() throws Exception {
            String longNote = "B".repeat(1001);
            UpdateOrderStatusRequest req = UpdateOrderStatusRequest.builder()
                    .status(OrderStatus.CONFIRMED)
                    .note(longNote)
                    .build();

            mockMvc.perform(put("/api/v1/admin/orders/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Ghi chú không được vượt quá 1000 ký tự")));
        }
    }

    // =========================================================================
    // 5. KIỂM THỬ API LỊCH SỬ TRẠNG THÁI (GET /api/v1/admin/orders/{id}/history)
    // =========================================================================

    @Nested
    @DisplayName("5. API Lịch sử trạng thái đơn hàng (Timeline)")
    class OrderStatusHistoryTests {

        @Test
        @DisplayName("TC-296-HIST-01: Admin lấy toàn bộ Timeline của đơn hàng -> 200 OK kèm danh sách mốc thời gian")
        void testGetOrderStatusHistory_AdminRole_Success() throws Exception {
            OrderStatusHistoryResponse h1 = OrderStatusHistoryResponse.builder()
                    .id(1L)
                    .orderId(1L)
                    .status(OrderStatus.PENDING)
                    .statusDescription("Đơn hàng mới tạo")
                    .updatedBy("CUSTOMER:100")
                    .actorRole("ROLE_CUSTOMER")
                    .note("Đặt hàng thành công")
                    .createdAt(LocalDateTime.now().minusHours(3))
                    .build();

            OrderStatusHistoryResponse h2 = OrderStatusHistoryResponse.builder()
                    .id(2L)
                    .orderId(1L)
                    .status(OrderStatus.CONFIRMED)
                    .statusDescription("Đã xác nhận")
                    .updatedBy("ADMIN:1")
                    .actorRole("ROLE_ADMIN")
                    .note("Admin đã duyệt đơn")
                    .createdAt(LocalDateTime.now().minusHours(1))
                    .build();

            when(orderService.getOrderStatusHistory(eq(1L), isNull(), eq("ROLE_ADMIN"))).thenReturn(List.of(h1, h2));

            mockMvc.perform(get("/api/v1/admin/orders/1/history")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data[0].status").value("PENDING"))
                    .andExpect(jsonPath("$.data[1].status").value("CONFIRMED"))
                    .andExpect(jsonPath("$.data[1].updatedBy").value("ADMIN:1"));
        }
    }

    // =========================================================================
    // 6. KIỂM THỬ API THỐNG KÊ DOANH THU & ĐƠN HÀNG (GET /api/v1/admin/orders/statistics)
    // =========================================================================

    @Nested
    @DisplayName("6. API Thống kê Dashboard (Statistics)")
    class OrderStatisticsTests {

        @Test
        @DisplayName("TC-296-STAT-01: Admin xem thống kê doanh thu và đơn hàng -> 200 OK kèm dữ liệu Dashboard đầy đủ")
        void testGetOrderStatistics_AdminRole_Success() throws Exception {
            DashboardResponse stats = DashboardResponse.builder()
                    .totalOrders(100L)
                    .totalRevenue(new BigDecimal("50000000.00"))
                    .ordersByStatus(Map.of(
                            OrderStatus.PENDING, 10L,
                            OrderStatus.CONFIRMED, 20L,
                            OrderStatus.SHIPPING, 15L,
                            OrderStatus.DELIVERED, 50L,
                            OrderStatus.CANCELLED, 5L
                    ))
                    .build();

            when(orderService.getOrderStatistics()).thenReturn(stats);

            mockMvc.perform(get("/api/v1/admin/orders/statistics")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.totalOrders").value(100))
                    .andExpect(jsonPath("$.data.totalRevenue").value(50000000.00))
                    .andExpect(jsonPath("$.data.ordersByStatus.DELIVERED").value(50))
                    .andExpect(jsonPath("$.data.ordersByStatus.PENDING").value(10));
        }
    }
}
