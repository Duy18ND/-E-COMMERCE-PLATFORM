package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.UpdateOrderStatusRequest;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.OrderStatusHistoryResponse;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-318] [BE] QA Test - API, validation và quyền truy cập (Theo dõi đơn hàng chi tiết)
 * Sprint: Sprint 2
 * Parent Task: ECOM-309 ([BE] Theo dõi đơn hàng chi tiết)
 * Feature (Mục mẹ): ECOM-159 (Theo dõi đơn hàng chi tiết)
 * PIC: NGÔ PHƯƠNG
 */
@WebMvcTest({OrderController.class, AdminOrderController.class})
@DisplayName("[ECOM-318] QA Test - Theo dõi đơn hàng chi tiết: API, Validation, State Machine & Phân quyền IDOR")
class OrderTrackingApiQATest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    @Nested
    @DisplayName("1. API Lịch sử trạng thái đơn hàng Customer (GET /api/v1/orders/{id}/history)")
    class CustomerOrderTimelineHistoryTests {

        @Test
        @DisplayName("TC-318-BE-01: Chủ sở hữu đơn hàng lấy lịch sử Timeline thành công -> 200 OK kèm danh sách mốc thời gian thực tế")
        void getOrderStatusHistory_Owner_ShouldReturn200WithTimeline() throws Exception {
            OrderStatusHistoryResponse step1 = OrderStatusHistoryResponse.builder()
                    .id(1L)
                    .orderId(1001L)
                    .status(OrderStatus.PENDING)
                    .statusDescription(OrderStatusHistoryResponse.getStatusDescription(OrderStatus.PENDING))
                    .previousStatus(null)
                    .action("ORDER_CREATED")
                    .updatedBy("CUSTOMER:10")
                    .actorRole("ROLE_CUSTOMER")
                    .note("Đơn hàng đã được đặt thành công")
                    .createdAt(LocalDateTime.now().minusHours(2))
                    .build();

            OrderStatusHistoryResponse step2 = OrderStatusHistoryResponse.builder()
                    .id(2L)
                    .orderId(1001L)
                    .status(OrderStatus.CONFIRMED)
                    .statusDescription(OrderStatusHistoryResponse.getStatusDescription(OrderStatus.CONFIRMED))
                    .previousStatus(OrderStatus.PENDING)
                    .action("ADMIN_STATUS_UPDATE")
                    .updatedBy("ADMIN:1")
                    .actorRole("ROLE_ADMIN")
                    .note("Admin xác nhận đơn hàng")
                    .createdAt(LocalDateTime.now().minusHours(1))
                    .build();

            when(orderService.getOrderStatusHistory(1001L, 10L, "ROLE_USER"))
                    .thenReturn(List.of(step1, step2));

            mockMvc.perform(get("/api/v1/orders/1001/history")
                            .header("X-User-Id", 10L)
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].status").value("PENDING"))
                    .andExpect(jsonPath("$.data[0].actorRole").value("ROLE_CUSTOMER"))
                    .andExpect(jsonPath("$.data[1].status").value("CONFIRMED"))
                    .andExpect(jsonPath("$.data[1].previousStatus").value("PENDING"))
                    .andExpect(jsonPath("$.data[1].updatedBy").value("ADMIN:1"))
                    .andExpect(jsonPath("$.data[1].actorRole").value("ROLE_ADMIN"))
                    .andExpect(jsonPath("$.data[1].note").value("Admin xác nhận đơn hàng"));
        }

        @Test
        @DisplayName("TC-318-BE-02: [Chống IDOR] Khách hàng cố xem lịch sử đơn hàng của người khác -> 403 Forbidden")
        void getOrderStatusHistory_DifferentUser_ShouldReturn403Forbidden() throws Exception {
            when(orderService.getOrderStatusHistory(1001L, 999L, "ROLE_USER"))
                    .thenThrow(new AccessDeniedException("Bạn không có quyền xem lịch sử đơn hàng của người dùng khác"));

            mockMvc.perform(get("/api/v1/orders/1001/history")
                            .header("X-User-Id", 999L)
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("không có quyền xem lịch sử đơn hàng")));
        }

        @Test
        @DisplayName("TC-318-BE-03: [Chống Auth Bypass] Gọi GET /api/v1/orders/{id}/history thiếu X-User-Id -> 403 Forbidden")
        void getOrderStatusHistory_MissingUserId_ShouldReturn403Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/orders/1001/history"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("X-User-Id")));

            verifyNoInteractions(orderService);
        }

        @Test
        @DisplayName("TC-318-BE-04: Đơn hàng không tồn tại khi tra cứu lịch sử -> 404 Not Found")
        void getOrderStatusHistory_OrderNotFound_ShouldReturn404() throws Exception {
            when(orderService.getOrderStatusHistory(88888L, 10L, "ROLE_USER"))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: 88888"));

            mockMvc.perform(get("/api/v1/orders/88888/history")
                            .header("X-User-Id", 10L)
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Không tìm thấy đơn hàng")));
        }
    }

    @Nested
    @DisplayName("2. API Chi tiết đơn hàng kèm Timeline (GET /api/v1/orders/{id})")
    class OrderDetailWithTimelineTests {

        @Test
        @DisplayName("TC-318-BE-05: Chủ sở hữu xem chi tiết đơn hàng kèm mảng statusHistories đồng bộ -> 200 OK")
        void getOrderById_OwnerWithStatusHistories_ShouldReturn200() throws Exception {
            OrderStatusHistoryResponse h1 = OrderStatusHistoryResponse.builder()
                    .id(10L)
                    .orderId(1001L)
                    .status(OrderStatus.SHIPPING)
                    .statusDescription(OrderStatusHistoryResponse.getStatusDescription(OrderStatus.SHIPPING))
                    .previousStatus(OrderStatus.PROCESSING)
                    .updatedBy("ADMIN:1")
                    .actorRole("ROLE_ADMIN")
                    .note("Đã giao cho đơn vị vận chuyển")
                    .createdAt(LocalDateTime.now())
                    .build();

            OrderResponse orderResponse = OrderResponse.builder()
                    .id(1001L)
                    .userId(10L)
                    .receiverName("Nguyễn Văn A")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .totalAmount(new BigDecimal("32490000"))
                    .status(OrderStatus.SHIPPING)
                    .statusHistories(List.of(h1))
                    .build();

            when(orderService.getOrderById(1001L, 10L, "ROLE_USER")).thenReturn(orderResponse);

            mockMvc.perform(get("/api/v1/orders/1001")
                            .header("X-User-Id", 10L)
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1001L))
                    .andExpect(jsonPath("$.data.status").value("SHIPPING"))
                    .andExpect(jsonPath("$.data.statusHistories[0].status").value("SHIPPING"))
                    .andExpect(jsonPath("$.data.statusHistories[0].note").value("Đã giao cho đơn vị vận chuyển"));
        }

        @Test
        @DisplayName("TC-318-BE-06: [Chống IDOR] Khách hàng cố xem chi tiết đơn của người khác -> 403 Forbidden")
        void getOrderById_DifferentUser_ShouldReturn403Forbidden() throws Exception {
            when(orderService.getOrderById(1001L, 777L, "ROLE_USER"))
                    .thenThrow(new AccessDeniedException("Bạn không có quyền xem chi tiết đơn hàng này"));

            mockMvc.perform(get("/api/v1/orders/1001")
                            .header("X-User-Id", 777L)
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Nested
    @DisplayName("3. Đồng bộ Admin -> Customer & Ràng buộc State Machine (PUT /api/v1/admin/orders/{id}/status)")
    class AdminStatusSyncAndValidationTests {

        @Test
        @DisplayName("TC-318-BE-07: Admin cập nhật trạng thái kèm ghi chú trả về OrderResponse đồng bộ -> 200 OK")
        void updateOrderStatus_ValidTransitionWithNote_ShouldReturn200() throws Exception {
            UpdateOrderStatusRequest req = UpdateOrderStatusRequest.builder()
                    .status(OrderStatus.SHIPPING)
                    .note("Bàn giao cho Viettel Post - Mã vận đơn VTP998877")
                    .build();

            OrderStatusHistoryResponse latestHistory = OrderStatusHistoryResponse.builder()
                    .id(55L)
                    .orderId(1001L)
                    .status(OrderStatus.SHIPPING)
                    .previousStatus(OrderStatus.PROCESSING)
                    .updatedBy("ADMIN:1")
                    .actorRole("ROLE_ADMIN")
                    .note("Bàn giao cho Viettel Post - Mã vận đơn VTP998877")
                    .createdAt(LocalDateTime.now())
                    .build();

            OrderResponse syncedResponse = OrderResponse.builder()
                    .id(1001L)
                    .userId(10L)
                    .status(OrderStatus.SHIPPING)
                    .statusHistories(List.of(latestHistory))
                    .build();

            when(orderService.updateOrderStatus(
                    eq(1001L),
                    eq(OrderStatus.SHIPPING),
                    eq("ADMIN:1"),
                    eq("ROLE_ADMIN"),
                    eq("Bàn giao cho Viettel Post - Mã vận đơn VTP998877")
            )).thenReturn(syncedResponse);

            mockMvc.perform(put("/api/v1/admin/orders/1001/status")
                            .header("X-User-Id", 1L)
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("SHIPPING"))
                    .andExpect(jsonPath("$.data.statusHistories[0].status").value("SHIPPING"))
                    .andExpect(jsonPath("$.data.statusHistories[0].note").value("Bàn giao cho Viettel Post - Mã vận đơn VTP998877"));
        }

        @Test
        @DisplayName("TC-318-BE-08: Chặn chuyển lùi trạng thái trái phép (DELIVERED -> SHIPPING) -> 400 Bad Request")
        void updateOrderStatus_BackwardTransition_ShouldReturn400() throws Exception {
            UpdateOrderStatusRequest req = UpdateOrderStatusRequest.builder()
                    .status(OrderStatus.SHIPPING)
                    .note("Thử lùi trạng thái")
                    .build();

            when(orderService.updateOrderStatus(eq(1001L), eq(OrderStatus.SHIPPING), any(), any(), any()))
                    .thenThrow(new IllegalStateException("Không thể chuyển trạng thái đơn hàng từ DELIVERED sang SHIPPING"));

            mockMvc.perform(put("/api/v1/admin/orders/1001/status")
                            .header("X-User-Id", 1L)
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Không thể chuyển trạng thái")));
        }

        @Test
        @DisplayName("TC-318-BE-09: Chặn khách hàng (ROLE_USER) tự ý gọi API Admin đổi trạng thái -> 403 Forbidden")
        void updateOrderStatus_CustomerRole_ShouldReturn403() throws Exception {
            UpdateOrderStatusRequest req = UpdateOrderStatusRequest.builder()
                    .status(OrderStatus.DELIVERED)
                    .build();

            mockMvc.perform(put("/api/v1/admin/orders/1001/status")
                            .header("X-User-Id", 10L)
                            .header("X-User-Roles", "ROLE_USER")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(orderService);
        }
    }
}
