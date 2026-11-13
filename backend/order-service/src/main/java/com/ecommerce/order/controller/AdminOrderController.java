package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.UpdateOrderStatusRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.OrderStatusHistoryResponse;
import com.ecommerce.order.dto.response.PagedResponse;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
@Tag(name = "Admin Order Controller", description = "Quản lý đơn hàng và thống kê doanh thu toàn hệ thống cho Admin")
public class AdminOrderController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "createdAt", "updatedAt", "totalAmount", "status"
    );

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Lấy danh sách đơn hàng toàn hệ thống [ADMIN]", description = "Có phân trang và lọc theo trạng thái OrderStatus (tùy chọn). Yêu cầu header X-User-Roles chứa ROLE_ADMIN")
    public ResponseEntity<ApiResponse<PagedResponse<OrderResponse>>> getAllOrders(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        requireAdminRole(roles);

        String trimmedSortBy = sortBy != null ? sortBy.trim() : "";
        if (!ALLOWED_SORT_FIELDS.contains(trimmedSortBy)) {
            throw new IllegalArgumentException(
                    "Trường sắp xếp (sortBy) không hợp lệ: '" + sortBy + "'. Chỉ chấp nhận: " + ALLOWED_SORT_FIELDS);
        }

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, trimmedSortBy));

        PagedResponse<OrderResponse> response = orderService.getAllOrders(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn hàng thành công", response));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái đơn hàng [ADMIN]", description = "Kiểm tra State Machine và hoàn lại tồn kho qua ProductClient nếu trạng thái mới là CANCELLED. Ghi nhận người cập nhật và thời điểm vào order_status_history. Yêu cầu header X-User-Roles chứa ROLE_ADMIN")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @RequestHeader(value = "X-User-Id", required = false) Long adminId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {

        requireAdminRole(roles);

        String updatedBy = adminId != null ? "ADMIN:" + adminId : "ADMIN";
        OrderResponse response = orderService.updateOrderStatus(id, request.getStatus(), updatedBy, "ROLE_ADMIN", request.getNote());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái đơn hàng thành công", response));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Xem lịch sử trạng thái đơn hàng [ADMIN]", description = "Lấy toàn bộ dòng thời gian (Timeline) các mốc thay đổi trạng thái, người cập nhật và ghi chú. Yêu cầu ROLE_ADMIN")
    public ResponseEntity<ApiResponse<List<OrderStatusHistoryResponse>>> getOrderStatusHistory(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {

        requireAdminRole(roles);

        List<OrderStatusHistoryResponse> response = orderService.getOrderStatusHistory(id, null, roles);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử trạng thái đơn hàng thành công", response));
    }

    /**
     * [Task ECOM-143 / ECOM-145] Admin xem danh sách lịch sử mua hàng của một khách hàng cụ thể.
     * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
     */
    @GetMapping("/customer/{userId}")
    @Operation(summary = "Xem lịch sử mua hàng của khách hàng [ADMIN]", description = "Lấy toàn bộ danh sách đơn hàng đã đặt của một khách hàng cụ thể. Yêu cầu ROLE_ADMIN")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getOrdersByCustomer(
            @RequestHeader(value = "X-User-Id", required = false) Long adminId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long userId) {

        requireAdminRole(roles);

        Long effectiveAdminId = adminId != null ? adminId : 0L;
        List<OrderResponse> response = orderService.getOrdersByUserId(userId, effectiveAdminId, roles);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử mua hàng của khách hàng thành công", response));
    }

    @GetMapping({"/statistics", "/stats"})
    @Operation(summary = "Thống kê doanh thu và đơn hàng [ADMIN]", description = "Tính toán tổng số đơn hàng, tổng doanh thu và số lượng đơn hàng theo từng trạng thái bằng COUNT & SUM dưới Database. Yêu cầu header X-User-Roles chứa ROLE_ADMIN")
    public ResponseEntity<ApiResponse<DashboardResponse>> getOrderStatistics(
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        requireAdminRole(roles);

        DashboardResponse response = orderService.getOrderStatistics();
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê doanh thu thành công", response));
    }

    private void requireAdminRole(String roles) {
        boolean isAdmin = roles != null && Arrays.stream(roles.split(","))
                .map(String::trim)
                .anyMatch("ROLE_ADMIN"::equals);
        if (!isAdmin) {
            throw new AccessDeniedException("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này");
        }
    }
}
