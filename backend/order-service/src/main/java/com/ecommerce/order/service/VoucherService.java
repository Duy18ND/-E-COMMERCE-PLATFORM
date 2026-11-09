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

    /**
     * [Task ECOM-167] Lấy danh sách voucher hợp lệ cho khách hàng cụ thể (loại bỏ mã khách đã sử dụng).
     */
    default List<VoucherResponse> getAvailableVouchersForUser(Long userId) {
        return getActiveVouchers();
    }

    /**
     * [Task ECOM-167 / ECOM-183] Kiểm tra người dùng đã sử dụng mã voucher này chưa (chặn dùng trùng).
     */
    default void validateUserCanUseVoucher(String rawCode, Long userId) {
    }

    /**
     * [Task ECOM-166 / ECOM-167 / ECOM-183] Ghi nhận lịch sử sử dụng voucher vào bảng voucher_usages.
     */
    default void recordVoucherUsage(String rawCode, Long userId, Long orderId, BigDecimal discountAmount) {
    }

    /**
     * [Task ECOM-167 / ECOM-183] Xác thực, chặn dùng trùng theo userId, trừ lượt nguyên tử và lưu voucher_usages.
     */
    default BigDecimal redeemVoucherForOrder(String rawCode, BigDecimal subtotalAmount, Long userId, Long orderId) {
        validateUserCanUseVoucher(rawCode, userId);
        BigDecimal discount = redeemVoucherForOrder(rawCode, subtotalAmount);
        recordVoucherUsage(rawCode, userId, orderId, discount);
        return discount;
    }

    /**
     * [Task ECOM-183] Đánh dấu bản ghi voucher_usages thành RESTORED khi đơn hàng bị hủy hoặc lỗi thanh toán.
     */
    default void restoreVoucherUsageForOrder(String voucherCode, Long userId, Long orderId) {
    }
}

