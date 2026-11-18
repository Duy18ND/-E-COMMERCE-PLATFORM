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
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

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
        int repairedCount = 0;
        for (Voucher v : defaultVouchers) {
            Optional<Voucher> existingOpt = voucherRepository.findByCodeIgnoreCase(v.getCode());
            if (existingOpt.isEmpty()) {
                voucherRepository.save(v);
                seededCount++;
            } else {
                Voucher existing = existingOpt.get();
                boolean dirty = false;
                if (isMojibake(existing.getName())) {
                    existing.setName(v.getName());
                    dirty = true;
                }
                if (isMojibake(existing.getDescription())) {
                    existing.setDescription(v.getDescription());
                    dirty = true;
                }
                if (dirty) {
                    voucherRepository.save(existing);
                    repairedCount++;
                }
            }
        }
        for (Voucher other : voucherRepository.findAll()) {
            String fixedName = repairMysqlLatin1Mojibake(other.getName());
            String fixedDesc = repairMysqlLatin1Mojibake(other.getDescription());
            if (!java.util.Objects.equals(fixedName, other.getName())
                    || !java.util.Objects.equals(fixedDesc, other.getDescription())) {
                other.setName(fixedName);
                other.setDescription(fixedDesc);
                voucherRepository.save(other);
                repairedCount++;
            }
        }
        if (seededCount > 0) {
            log.info("Seeded {} default vouchers into order_db.", seededCount);
        }
        if (repairedCount > 0) {
            log.info("Repaired UTF-8 mojibake on {} voucher record(s) in order_db.", repairedCount);
        }
    }

    static boolean isMojibake(String value) {
        if (value == null || value.isEmpty()) {
            return false;
        }
        String repaired = repairMysqlLatin1Mojibake(value);
        if (!repaired.equals(value)) {
            return true;
        }
        return value.indexOf('\uFFFD') >= 0
                || value.contains("áº")
                || value.contains("á»")
                || value.contains("Ä‘")
                || value.contains("Æ°")
                || value.contains("Æ¡");
    }

    static String repairMysqlLatin1Mojibake(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        boolean hasNonAscii = false;
        byte[] bytes = new byte[value.length()];
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (ch >= 0x80) {
                hasNonAscii = true;
            }
            int mapped = toMysqlLatin1Byte(ch);
            if (mapped < 0) {
                return value;
            }
            bytes[i] = (byte) mapped;
        }
        if (!hasNonAscii) {
            return value;
        }
        try {
            String decoded = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
            return decoded.equals(value) ? value : decoded;
        } catch (CharacterCodingException ex) {
            return value;
        }
    }

    private static int toMysqlLatin1Byte(char ch) {
        if (ch <= 0xFF) {
            return ch;
        }
        return switch (ch) {
            case '\u20AC' -> 0x80;
            case '\u201A' -> 0x82;
            case '\u0192' -> 0x83;
            case '\u201E' -> 0x84;
            case '\u2026' -> 0x85;
            case '\u2020' -> 0x86;
            case '\u2021' -> 0x87;
            case '\u02C6' -> 0x88;
            case '\u2030' -> 0x89;
            case '\u0160' -> 0x8A;
            case '\u2039' -> 0x8B;
            case '\u0152' -> 0x8C;
            case '\u017D' -> 0x8E;
            case '\u2018' -> 0x91;
            case '\u2019' -> 0x92;
            case '\u201C' -> 0x93;
            case '\u201D' -> 0x94;
            case '\u2022' -> 0x95;
            case '\u2013' -> 0x96;
            case '\u2014' -> 0x97;
            case '\u02DC' -> 0x98;
            case '\u2122' -> 0x99;
            case '\u0161' -> 0x9A;
            case '\u203A' -> 0x9B;
            case '\u0153' -> 0x9C;
            case '\u017E' -> 0x9E;
            case '\u0178' -> 0x9F;
            default -> -1;
        };
    }
}

