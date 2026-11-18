package com.ecommerce.product.config;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Configuration;

import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.FlashSaleCampaign;
import com.ecommerce.product.entity.FlashSaleItem;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.repository.FlashSaleCampaignRepository;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.FlashSaleService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

        private final CategoryRepository categoryRepository;
        private final ProductRepository productRepository;

        @Autowired(required = false)
        private FlashSaleCampaignRepository flashSaleCampaignRepository;

        @Autowired(required = false)
        private FlashSaleService flashSaleService;

        @Autowired(required = false)
        private CacheManager cacheManager;

        @Override
        public void run(String... args) {
                boolean repairedCategories = seedOrRepairCategories();
                boolean repairedProducts = seedOrRepairProducts();
                if ((repairedCategories || repairedProducts) && cacheManager != null) {
                        Cache productsCache = cacheManager.getCache(CacheConfig.PRODUCTS_CACHE);
                        if (productsCache != null) {
                                productsCache.clear();
                        }
                }
                seedFlashSaleCampaign();
        }

        private boolean seedOrRepairCategories() {
                if (categoryRepository.count() > 0) {
                        return repairMojibakeCategories();
                }

                List<Category> categories = List.of(
                                Category.builder()
                                                .name("Điện thoại & Tablet")
                                                .description("iPhone, Galaxy, iPad thế hệ mới chính hãng phân phối")
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80")
                                                .build(),
                                Category.builder()
                                                .name("Laptop & Workstation")
                                                .description("MacBook, Dell XPS, ThinkPad phục vụ học tập, đồ họa, lập trình")
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80")
                                                .build(),
                                Category.builder()
                                                .name("Phụ Kiện & Âm Thanh")
                                                .description("Tai nghe hi-res, bàn phím cơ, chuột không dây và củ sạc nhanh")
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80")
                                                .build(),
                                Category.builder()
                                                .name("Nhà Thông Minh & Gia Dụng")
                                                .description("Robot hút bụi, máy lọc không khí và đèn thông minh tiện nghi")
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80")
                                                .build());

                categoryRepository.saveAll(categories);
                log.info("Seeded {} sample categories successfully.", categories.size());
                return false;
        }

        private boolean seedOrRepairProducts() {
                if (productRepository.count() > 0) {
                        return repairMojibakeProducts();
                }

                List<Product> products = List.of(
                                Product.builder()
                                                .name("Laptop Dell XPS 15")
                                                .category("Laptop & Workstation")
                                                .price(new BigDecimal("32990000"))
                                                .stockQuantity(50)
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80")
                                                .description(
                                                                "Laptop Dell XPS 15 cao cấp trang bị vi xử lý Intel Core i7 thế hệ mới, màn hình OLED 3.5K sắc nét.")
                                                .status(ProductStatus.ACTIVE)
                                                .build(),
                                Product.builder()
                                                .name("iPhone 15 Pro Max 256GB")
                                                .category("Điện thoại & Tablet")
                                                .price(new BigDecimal("29990000"))
                                                .stockQuantity(100)
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80")
                                                .description(
                                                                "iPhone 15 Pro Max khung Titan chuẩn hàng không vũ trụ, chip A17 Pro đỉnh cao và camera tiềm vọng.")
                                                .status(ProductStatus.ACTIVE)
                                                .build(),
                                Product.builder()
                                                .name("Tai nghe Sony WH-1000XM5")
                                                .category("Phụ Kiện & Âm Thanh")
                                                .price(new BigDecimal("7490000"))
                                                .stockQuantity(200)
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80")
                                                .description(
                                                                "Tai nghe chụp tai chống ồn hàng đầu thế giới với vi xử lý V1 + QN1 tích hợp và chất âm Hi-Res.")
                                                .status(ProductStatus.ACTIVE)
                                                .build(),
                                Product.builder()
                                                .name("Robot Hút Bụi Deebot X2 OMNI")
                                                .category("Nhà Thông Minh & Gia Dụng")
                                                .price(new BigDecimal("18990000"))
                                                .stockQuantity(15)
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80")
                                                .description(
                                                                "Robot hút bụi lau nhà hình vuông thông minh với lực hút 8000Pa và trạm sạc giặt giẻ tự động.")
                                                .status(ProductStatus.ACTIVE)
                                                .build(),
                                Product.builder()
                                                .name("Bàn phím cơ không dây đa kết nối")
                                                .category("Phụ Kiện & Âm Thanh")
                                                .price(new BigDecimal("1850000"))
                                                .stockQuantity(25)
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80")
                                                .description(
                                                                "Bàn phím cơ layout 75% gõ êm ái, hỗ trợ Bluetooth 5.1, Wireless 2.4G và Type-C đa nền tảng.")
                                                .status(ProductStatus.ACTIVE)
                                                .build(),
                                Product.builder()
                                                .name("MacBook Air M2 13 inch")
                                                .category("Laptop & Workstation")
                                                .price(new BigDecimal("24500000"))
                                                .stockQuantity(8)
                                                .imageUrl(
                                                                "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80")
                                                .description(
                                                                "MacBook Air M2 thiết kế mỏng nhẹ đẳng cấp, thời lượng pin lên đến 18 giờ và màn hình Liquid Retina.")
                                                .status(ProductStatus.ACTIVE)
                                                .build());

                productRepository.saveAll(products);
                log.info("Seeded {} sample products successfully.", products.size());
                return false;
        }

        private boolean repairMojibakeCategories() {
                int repaired = 0;
                for (Category cat : categoryRepository.findAll()) {
                        String fixedName = repairMysqlLatin1Mojibake(cat.getName());
                        String fixedDesc = repairMysqlLatin1Mojibake(cat.getDescription());
                        boolean dirty = false;
                        if (!Objects.equals(fixedName, cat.getName()) && !categoryRepository.existsByName(fixedName)) {
                                cat.setName(fixedName);
                                dirty = true;
                        }
                        if (!Objects.equals(fixedDesc, cat.getDescription())) {
                                cat.setDescription(fixedDesc);
                                dirty = true;
                        }
                        if (dirty) {
                                categoryRepository.save(cat);
                                repaired++;
                        }
                }
                if (repaired > 0) {
                        log.info("Repaired UTF-8 mojibake on {} category record(s) in product_db.", repaired);
                } else {
                        log.info("Categories already exist, skipping seeding.");
                }
                return repaired > 0;
        }

        private boolean repairMojibakeProducts() {
                int repaired = 0;
                for (Product product : productRepository.findAll()) {
                        String fixedName = repairMysqlLatin1Mojibake(product.getName());
                        String fixedCategory = repairMysqlLatin1Mojibake(product.getCategory());
                        String fixedDesc = repairMysqlLatin1Mojibake(product.getDescription());
                        boolean dirty = false;
                        if (!Objects.equals(fixedName, product.getName())) {
                                product.setName(fixedName);
                                dirty = true;
                        }
                        if (!Objects.equals(fixedCategory, product.getCategory())) {
                                product.setCategory(fixedCategory);
                                dirty = true;
                        }
                        if (!Objects.equals(fixedDesc, product.getDescription())) {
                                product.setDescription(fixedDesc);
                                dirty = true;
                        }
                        if (dirty) {
                                productRepository.save(product);
                                repaired++;
                        }
                }
                if (repaired > 0) {
                        log.info("Repaired UTF-8 mojibake on {} product record(s) in product_db.", repaired);
                } else {
                        log.info("Products already exist, skipping seeding.");
                }
                return repaired > 0;
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

        private void seedFlashSaleCampaign() {
                if (flashSaleCampaignRepository == null) {
                        return;
                }
                if (flashSaleCampaignRepository.count() > 0) {
                        log.info("Flash Sale campaigns already exist, skipping seeding.");
                        return;
                }
                List<Product> allProducts = productRepository.findAll();
                if (allProducts.isEmpty()) {
                        return;
                }

                FlashSaleCampaign campaign = FlashSaleCampaign.builder()
                                .name("Flash Sale Giữa Tháng Tech Day")
                                .startTime(LocalDateTime.now().minusHours(2))
                                .endTime(LocalDateTime.now().plusDays(30))
                                .status("ACTIVE")
                                .build();

                for (Product p : allProducts) {
                        if (p.getId() == null || p.getPrice() == null) {
                                continue;
                        }
                        // Giảm 20% giá Flash Sale so với giá gốc (làm tròn nghìn đồng)
                        long rawSale = Math.round(p.getPrice().doubleValue() * 0.8 / 10000.0) * 10000L;
                        BigDecimal fsPrice = BigDecimal.valueOf(Math.max(10000L, rawSale));
                        int fsQty = Math.max(5, Math.min(20, p.getStockQuantity() != null ? p.getStockQuantity() : 10));

                        FlashSaleItem item = FlashSaleItem.builder()
                                        .productId(p.getId())
                                        .flashSalePrice(fsPrice)
                                        .quantity(fsQty)
                                        .soldQuantity(0)
                                        .userLimit(5)
                                        .build();
                        campaign.addItem(item);
                }

                FlashSaleCampaign saved = flashSaleCampaignRepository.save(campaign);
                if (flashSaleService != null && saved.getItems() != null) {
                        for (FlashSaleItem item : saved.getItems()) {
                                try {
                                        flashSaleService.initFlashSaleStock(item.getProductId(), item.getQuantity());
                                } catch (Exception ex) {
                                        log.warn("Could not init Redis stock for seeded Flash Sale productId={}: {}",
                                                        item.getProductId(), ex.getMessage());
                                }
                        }
                }
                log.info("Seeded active Flash Sale campaign '{}' with {} items.", saved.getName(), saved.getItems().size());
        }
}
