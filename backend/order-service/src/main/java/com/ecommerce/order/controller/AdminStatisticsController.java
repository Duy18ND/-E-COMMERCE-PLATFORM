package com.ecommerce.order.controller;

import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

/**
 * [Task ECOM-145 / ECOM-326] Quản lý thống kê kinh doanh toàn hệ thống cho Admin:
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 *
 * - Task ECOM-145: Xây dựng API Thống kê tổng doanh thu, tổng số đơn và trạng thái xử lý.
 * - Task ECOM-326: API thống kê doanh thu / đơn hàng theo thời gian thực trực tiếp từ Database.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/statistics")
@RequiredArgsConstructor
@Tag(name = "Admin Statistics Controller", description = "Báo cáo thống kê doanh thu và đơn hàng toàn hệ thống cho Admin")
public class AdminStatisticsController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Lấy báo cáo thống kê doanh thu và đơn hàng [ADMIN]", description = "Tính toán tổng số đơn hàng, tổng doanh thu và phân bổ trạng thái đơn hàng. Yêu cầu ROLE_ADMIN")
    public ResponseEntity<ApiResponse<DashboardResponse>> getStatistics(
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        requireAdminRole(roles);

        DashboardResponse response = orderService.getOrderStatistics();
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo thống kê thành công", response));
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

