package com.ecommerce.product.config;

import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.repository.ProductRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

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
    @DisplayName("Khôi phục danh mục và sản phẩm bị lỗi mã hóa latin1 mojibake về UTF-8 chuẩn")
    void repairsMojibakeCategoriesAndProducts() {
        Category cat1 = Category.builder()
                .id(1L)
                .name(corruptAsMysqlLatin1("Điện thoại & Tablet"))
                .description(corruptAsMysqlLatin1("iPhone, Galaxy, iPad thế hệ mới chính hãng phân phối"))
                .build();
        Category cat3 = Category.builder()
                .id(3L)
                .name(corruptAsMysqlLatin1("Phụ Kiện & Âm Thanh"))
                .description(corruptAsMysqlLatin1("Tai nghe hi-res, bàn phím cơ, chuột không dây và củ sạc nhanh"))
                .build();

        Product prod5 = Product.builder()
                .id(5L)
                .name(corruptAsMysqlLatin1("Bàn phím cơ không dây đa kết nối"))
                .category(corruptAsMysqlLatin1("Phụ Kiện & Âm Thanh"))
                .description(corruptAsMysqlLatin1("Bàn phím cơ layout 75% gõ êm ái"))
                .price(new BigDecimal("1850000"))
                .stockQuantity(25)
                .status(ProductStatus.ACTIVE)
                .build();

        when(categoryRepository.count()).thenReturn(2L);
        when(categoryRepository.findAll()).thenReturn(List.of(cat1, cat3));
        when(categoryRepository.existsByName(anyString())).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        when(productRepository.count()).thenReturn(1L);
        when(productRepository.findAll()).thenReturn(List.of(prod5));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        DataInitializer initializer = new DataInitializer(categoryRepository, productRepository);
        initializer.run();

        assertThat(cat1.getName()).isEqualTo("Điện thoại & Tablet");
        assertThat(cat1.getDescription()).isEqualTo("iPhone, Galaxy, iPad thế hệ mới chính hãng phân phối");
        assertThat(cat3.getName()).isEqualTo("Phụ Kiện & Âm Thanh");
        assertThat(prod5.getName()).isEqualTo("Bàn phím cơ không dây đa kết nối");
        assertThat(prod5.getCategory()).isEqualTo("Phụ Kiện & Âm Thanh");
        assertThat(prod5.getDescription()).isEqualTo("Bàn phím cơ layout 75% gõ êm ái");

        verify(categoryRepository, times(2)).save(any(Category.class));
        verify(productRepository, times(1)).save(prod5);
    }
}
