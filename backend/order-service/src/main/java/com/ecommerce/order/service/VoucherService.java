package com.ecommerce.order.service;

import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.VoucherResponse;

import java.math.BigDecimal;
import java.util.List;

public interface VoucherService {

    // ── Admin operations ──────────────────────────────────────────
    List<VoucherResponse> getAllVouchers();

    VoucherResponse getVoucherById(Long id);

    VoucherResponse createVoucher(VoucherRequest request);

    VoucherResponse updateVoucher(Long id, VoucherRequest request);

    VoucherResponse toggleVoucherStatus(Long id);

    void deleteVoucher(Long id);

    // ── Customer operations ───────────────────────────────────────
    List<VoucherResponse> getActiveVouchers();

    ApplyVoucherResponse applyVoucher(ApplyVoucherRequest request);

    /**
     * Xác thực và trừ lượt voucher trực tiếp khi đặt hàng (checkout).
     * Trả về số tiền được giảm giá (discountAmount).
     * Ném ngoại lệ nếu mã không hợp lệ, hết hạn hoặc hết lượt.
     */
    BigDecimal redeemVoucherForOrder(String rawCode, BigDecimal subtotalAmount);

    /**
     * Hoàn lại 1 lượt sử dụng voucher khi đơn hàng bị hủy hoặc thanh toán thất bại.
     */
    void restoreVoucherUsage(String voucherCode);
}

