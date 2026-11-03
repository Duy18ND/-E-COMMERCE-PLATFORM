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

@Slf4j
@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
@Tag(name = "Voucher Controller", description = "Tra cứu và kiểm tra áp dụng mã giảm giá cho khách hàng")
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping("/active")
    @Operation(summary = "Lấy danh sách voucher đang có hiệu lực [PUBLIC]")
    public ResponseEntity<ApiResponse<List<VoucherResponse>>> getActiveVouchers() {
        List<VoucherResponse> response = voucherService.getActiveVouchers();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá thành công", response));
    }

    @PostMapping("/apply")
    @Operation(summary = "Kiểm tra và tính số tiền giảm của mã voucher tại bước Checkout")
    public ResponseEntity<ApiResponse<ApplyVoucherResponse>> applyVoucher(
            @Valid @RequestBody ApplyVoucherRequest request) {
        ApplyVoucherResponse response = voucherService.applyVoucher(request);
        return ResponseEntity.ok(ApiResponse.success("Áp dụng mã giảm giá thành công", response));
    }
}

