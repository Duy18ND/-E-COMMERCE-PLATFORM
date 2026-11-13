package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.exception.AccessDeniedException;
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
        if (userId != null && userId <= 0) {
            throw new AccessDeniedException("Thông tin người dùng xác thực (X-User-Id) không hợp lệ");
        }
        if (queryUserId != null && (userId == null || !userId.equals(queryUserId))) {
            log.warn("Blocked IDOR attempt on GET /vouchers/active: headerXUserId={}, queryUserId={}",
                    userId, queryUserId);
            throw new AccessDeniedException("Bạn không có quyền truy vấn danh sách voucher cá nhân của người dùng khác");
        }
        List<VoucherResponse> response = (userId != null)
                ? voucherService.getAvailableVouchersForUser(userId)
                : voucherService.getActiveVouchers();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá thành công", response));
    }

    @PostMapping("/apply")
    @Operation(summary = "Kiểm tra và tính số tiền giảm của mã voucher tại bước Checkout")
    public ResponseEntity<ApiResponse<ApplyVoucherResponse>> applyVoucher(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody ApplyVoucherRequest request) {
        if (userId != null && userId <= 0) {
            throw new AccessDeniedException("Thông tin người dùng xác thực (X-User-Id) không hợp lệ");
        }
        if (authorizationHeader != null && !authorizationHeader.trim().isEmpty() && userId == null) {
            throw new AccessDeniedException("Token xác thực không hợp lệ hoặc đã hết hạn");
        }
        if (userId != null && request.getUserId() != null && !userId.equals(request.getUserId())) {
            log.warn("Overriding spoofed userId in ApplyVoucherRequest: authenticatedUserId={}, bodyUserId={}",
                    userId, request.getUserId());
        }
        // Không tin userId do Frontend gửi trong body; chỉ lấy danh tính từ X-User-Id đã xác thực bởi Gateway
        request.setUserId(userId);
        ApplyVoucherResponse response = voucherService.applyVoucher(request);
        return ResponseEntity.ok(ApiResponse.success("Áp dụng mã giảm giá thành công", response));
    }
}

