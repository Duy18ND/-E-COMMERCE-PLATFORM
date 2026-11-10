package com.ecommerce.order.enums;

/**
 * [Task ECOM-166 / ECOM-167 / ECOM-183] Trạng thái lượt sử dụng voucher của người dùng.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
public enum VoucherUsageStatus {
    /**
     * Đã áp dụng vào đơn hàng (giữ lượt, chặn cùng user dùng trùng mã).
     */
    APPLIED,

    /**
     * Đã hoàn lượt do đơn hàng bị hủy hoặc thanh toán thất bại (cho phép user áp lại mã).
     */
    RESTORED
}

