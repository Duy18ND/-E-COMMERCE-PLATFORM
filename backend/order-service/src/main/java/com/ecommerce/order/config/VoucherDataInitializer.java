package com.ecommerce.order.config;

import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Khởi tạo dữ liệu mẫu cho bảng vouchers trong order_db (đồng bộ với kho mã giảm giá trên Frontend)
 * để khi khách hàng áp dụng Voucher lúc Checkout, Backend luôn tính đúng discountAmount và finalTotalAmount.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class VoucherDataInitializer implements CommandLineRunner {

    private final VoucherRepository voucherRepository;

    @Override
    public void run(String... args) {
        LocalDate start = LocalDate.now().minusMonths(1);
        LocalDate end = LocalDate.now().plusYears(1);

        List<Voucher> defaultVouchers = List.of(
                Voucher.builder()
                        .code("GIAM20K")
                        .name("Giảm 20K đơn đầu ngày")
                        .description("Giảm 20.000đ cho đơn hàng từ 200.000đ")
                        .discountType(DiscountType.FIXED)
                        .discountValue(new BigDecimal("20000"))
                        .maxDiscount(null)
                        .minOrderValue(new BigDecimal("200000"))
                        .quantity(500)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build(),
                Voucher.builder()
                        .code("GIAM50K")
                        .name("Ưu đãi mua sắm 50K")
                        .description("Giảm 50.000đ cho đơn hàng từ 500.000đ")
                        .discountType(DiscountType.FIXED)
                        .discountValue(new BigDecimal("50000"))
                        .maxDiscount(null)
                        .minOrderValue(new BigDecimal("500000"))
                        .quantity(300)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build(),
                Voucher.builder()
                        .code("SALE10")
                        .name("Siêu sale công nghệ 10%")
                        .description("Giảm 10% tối đa 100.000đ cho đơn từ 300.000đ")
                        .discountType(DiscountType.PERCENT)
                        .discountValue(new BigDecimal("10"))
                        .maxDiscount(new BigDecimal("100000"))
                        .minOrderValue(new BigDecimal("300000"))
                        .quantity(1000)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build(),
                Voucher.builder()
                        .code("TECHVIP")
                        .name("Đặc quyền Tech VIP 15%")
                        .description("Giảm 15% tối đa 300.000đ cho đơn từ 1.000.000đ")
                        .discountType(DiscountType.PERCENT)
                        .discountValue(new BigDecimal("15"))
                        .maxDiscount(new BigDecimal("300000"))
                        .minOrderValue(new BigDecimal("1000000"))
                        .quantity(250)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build(),
                Voucher.builder()
                        .code("FREESHIP")
                        .name("Miễn phí vận chuyển toàn quốc")
                        .description("Giảm 30.000đ phí giao hàng cho đơn từ 150.000đ")
                        .discountType(DiscountType.FIXED)
                        .discountValue(new BigDecimal("30000"))
                        .maxDiscount(null)
                        .minOrderValue(new BigDecimal("150000"))
                        .quantity(1500)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build(),
                Voucher.builder()
                        .code("WELCOME100")
                        .name("Chào mừng thành viên mới")
                        .description("Giảm ngay 100.000đ cho đơn hàng đầu tiên từ 800.000đ")
                        .discountType(DiscountType.FIXED)
                        .discountValue(new BigDecimal("100000"))
                        .maxDiscount(null)
                        .minOrderValue(new BigDecimal("800000"))
                        .quantity(400)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build(),
                Voucher.builder()
                        .code("WELCOME50")
                        .name("Voucher chào mừng 50K")
                        .description("Giảm 50.000đ cho đơn hàng từ 200.000đ")
                        .discountType(DiscountType.FIXED)
                        .discountValue(new BigDecimal("50000"))
                        .maxDiscount(null)
                        .minOrderValue(new BigDecimal("200000"))
                        .quantity(500)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build(),
                Voucher.builder()
                        .code("VIP20")
                        .name("Ưu đãi thành viên VIP 20%")
                        .description("Giảm 20% tối đa 200.000đ cho đơn từ 500.000đ")
                        .discountType(DiscountType.PERCENT)
                        .discountValue(new BigDecimal("20"))
                        .maxDiscount(new BigDecimal("200000"))
                        .minOrderValue(new BigDecimal("500000"))
                        .quantity(300)
                        .usedQuantity(0)
                        .startDate(start)
                        .endDate(end)
                        .status(VoucherStatus.ACTIVE)
                        .build()
        );

        int seededCount = 0;
        for (Voucher v : defaultVouchers) {
            if (!voucherRepository.existsByCodeIgnoreCase(v.getCode())) {
                voucherRepository.save(v);
                seededCount++;
            }
        }
        if (seededCount > 0) {
            log.info("Seeded {} default vouchers into order_db.", seededCount);
        }
    }
}

