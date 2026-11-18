package com.ecommerce.order.config;

import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.repository.VoucherRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoucherDataInitializerTest {

    @Mock
    private VoucherRepository voucherRepository;

    private static String corruptAsMysqlLatin1(String utf8) {
        byte[] bytes = utf8.getBytes(StandardCharsets.UTF_8);
        StringBuilder sb = new StringBuilder(bytes.length);
        for (byte b : bytes) {
            int unsigned = b & 0xFF;
            if (unsigned <= 0x7F || unsigned >= 0xA0) {
                sb.append((char) unsigned);
            } else {
                sb.append(switch (unsigned) {
                    case 0x80 -> '\u20AC';
                    case 0x82 -> '\u201A';
                    case 0x83 -> '\u0192';
                    case 0x84 -> '\u201E';
                    case 0x85 -> '\u2026';
                    case 0x86 -> '\u2020';
                    case 0x87 -> '\u2021';
                    case 0x88 -> '\u02C6';
                    case 0x89 -> '\u2030';
                    case 0x8A -> '\u0160';
                    case 0x8B -> '\u2039';
                    case 0x8C -> '\u0152';
                    case 0x8E -> '\u017D';
                    case 0x91 -> '\u2018';
                    case 0x92 -> '\u2019';
                    case 0x93 -> '\u201C';
                    case 0x94 -> '\u201D';
                    case 0x95 -> '\u2022';
                    case 0x96 -> '\u2013';
                    case 0x97 -> '\u2014';
                    case 0x98 -> '\u02DC';
                    case 0x99 -> '\u2122';
                    case 0x9A -> '\u0161';
                    case 0x9B -> '\u203A';
                    case 0x9C -> '\u0153';
                    case 0x9E -> '\u017E';
                    case 0x9F -> '\u0178';
                    default -> (char) unsigned;
                });
            }
        }
        return sb.toString();
    }

    @Test
    @DisplayName("Khôi phục chính xác dữ liệu tiếng Việt bị lỗi latin1 mojibake và giữ nguyên các field khác")
    void repairsMojibakeOnExistingDefaultVouchers() {
        Voucher corrupted = Voucher.builder()
                .id(4L)
                .code("TECHVIP")
                .name(corruptAsMysqlLatin1("Đặc quyền Tech VIP 15%"))
                .description(corruptAsMysqlLatin1("Giảm 15% tối đa 300.000đ cho đơn từ 1.000.000đ"))
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("15"))
                .usedQuantity(12)
                .quantity(250)
                .status(VoucherStatus.ACTIVE)
                .build();

        when(voucherRepository.findByCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(voucherRepository.findByCodeIgnoreCase("TECHVIP")).thenReturn(Optional.of(corrupted));
        when(voucherRepository.findAll()).thenReturn(List.of(corrupted));
        when(voucherRepository.save(any(Voucher.class))).thenAnswer(inv -> inv.getArgument(0));

        VoucherDataInitializer initializer = new VoucherDataInitializer(voucherRepository);
        initializer.run();

        assertThat(corrupted.getName()).isEqualTo("Đặc quyền Tech VIP 15%");
        assertThat(corrupted.getDescription()).isEqualTo("Giảm 15% tối đa 300.000đ cho đơn từ 1.000.000đ");
        assertThat(corrupted.getUsedQuantity()).isEqualTo(12);
        assertThat(corrupted.getQuantity()).isEqualTo(250);
    }

    @Test
    @DisplayName("Không sửa nhầm văn bản tiếng Việt chuẩn UTF-8 hoặc ASCII")
    void leavesCleanVietnameseAndAsciiUntouched() {
        List<String> validTexts = List.of(
                "Giảm 20K đơn đầu ngày",
                "Đặc quyền Tech VIP 15%",
                "Cà phê sữa đá",
                "Áo thun nam",
                "MÃ ĐẶC BIỆT",
                "Tạm dừng",
                "Laptop Dell XPS 15"
        );
        for (String text : validTexts) {
            assertThat(VoucherDataInitializer.repairMysqlLatin1Mojibake(text)).isEqualTo(text);
            assertThat(VoucherDataInitializer.isMojibake(text)).isFalse();
        }

        String corrupted = corruptAsMysqlLatin1("Siêu sale công nghệ 10%");
        assertThat(VoucherDataInitializer.isMojibake(corrupted)).isTrue();
        assertThat(VoucherDataInitializer.repairMysqlLatin1Mojibake(corrupted)).isEqualTo("Siêu sale công nghệ 10%");
    }
}
