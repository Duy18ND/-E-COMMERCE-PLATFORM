package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.service.VoucherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * [Task ECOM-167 / ECOM-183] Controller tra cứu voucher hợp lệ, kiểm tra áp mã, chặn dùng trùng và quá lượt.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
@Tag(name = "Voucher Controller", description = "Tra cứu và kiểm tra áp dụng mã giảm giá cho khách hàng")
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping({"", "/active"})
    @Operation(summary = "Lấy danh sách voucher đang có hiệu lực [PUBLIC / USER]")
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getActiveVouchers(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(value = "userId", required = false) Long queryUserId) {
        Long effectiveUserId = (userId != null) ? userId : queryUserId;
        List<VoucherResponse> response = (effectiveUserId != null)
                ? voucherService.getAvailableVouchersForUser(effectiveUserId)
                : voucherService.getActiveVouchers();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá thành công", response));
    }

    @PostMapping("/apply")
    @Operation(summary = "Kiểm tra và tính số tiền giảm của mã voucher tại bước Checkout")
    public ResponseEntity<ApiResponse<ApplyVoucherResponse>> applyVoucher(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody ApplyVoucherRequest request) {
        if (userId != null) {
            request.setUserId(userId);
        }
        ApplyVoucherResponse response = voucherService.applyVoucher(request);
        return ResponseEntity.ok(ApiResponse.success("Áp dụng mã giảm giá thành công", response));
    }
}

