package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.service.VoucherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

/**
 * [Task ECOM-339] Controller Admin tạo, sửa, ẩn voucher, giới hạn lượt sử dụng.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/vouchers")
@RequiredArgsConstructor
@Tag(name = "Admin Voucher Controller", description = "Quản lý mã giảm giá, hạn sử dụng và số lượng phát hành cho Admin")
public class AdminVoucherController {

    private final VoucherService voucherService;

    @GetMapping
    @Operation(summary = "Lấy toàn bộ danh sách voucher hệ thống [ADMIN]")
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getAllVouchers(
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {
        requireAdminRole(roles);
        List<VoucherResponse> response = voucherService.getAllVouchers();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách voucher thành công", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết một voucher theo ID [ADMIN]")
    public ResponseEntity<ApiResponse<VoucherResponse>> getVoucherById(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {
        requireAdminRole(roles);
        VoucherResponse response = voucherService.getVoucherById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin voucher thành công", response));
    }

    @PostMapping
    @Operation(summary = "Tạo mới voucher [ADMIN]")
    public ResponseEntity<ApiResponse<VoucherResponse>> createVoucher(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @Valid @RequestBody VoucherRequest request) {
        requireAdminRole(roles);
        VoucherResponse response = voucherService.createVoucher(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo voucher thành công", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật voucher [ADMIN]")
    public ResponseEntity<ApiResponse<VoucherResponse>> updateVoucher(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id,
            @Valid @RequestBody VoucherRequest request) {
        requireAdminRole(roles);
        VoucherResponse response = voucherService.updateVoucher(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật voucher thành công", response));
    }

    @PatchMapping("/{id}/toggle-status")
    @Operation(summary = "Bật / Tắt trạng thái hoạt động của voucher [ADMIN]")
    public ResponseEntity<ApiResponse<VoucherResponse>> toggleVoucherStatus(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {
        requireAdminRole(roles);
        VoucherResponse response = voucherService.toggleVoucherStatus(id);
        return ResponseEntity.ok(ApiResponse.success("Thay đổi trạng thái voucher thành công", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa voucher khỏi hệ thống [ADMIN]")
    public ResponseEntity<ApiResponse<Void>> deleteVoucher(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {
        requireAdminRole(roles);
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa voucher thành công", null));
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

