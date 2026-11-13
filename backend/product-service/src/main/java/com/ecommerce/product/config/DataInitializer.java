package com.ecommerce.product.config;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
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

        @Override
        public void run(String... args) {
                seedCategories();
                seedProducts();
                seedFlashSaleCampaign();
        }

        private void seedCategories() {
                if (categoryRepository.count() > 0) {
                        log.info("Categories already exist, skipping seeding.");
                        return;
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
        }

        private void seedProducts() {
                if (productRepository.count() > 0) {
                        log.info("Products already exist, skipping seeding.");
                        return;
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
