package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductFilterRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockAdjustmentRequest;
import com.ecommerce.product.dto.request.StockInboundRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.DuplicateResourceException;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.impl.ProductServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private FlashSaleService flashSaleService;

    @InjectMocks
    private ProductServiceImpl productService;

    private Product sampleProduct;

    @BeforeEach
    void setUp() {
        sampleProduct = Product.builder()
                .id(1L)
                .name("MacBook Pro M3")
                .description("Apple Silicon M3 chip")
                .price(BigDecimal.valueOf(1999.99))
                .stockQuantity(10)
                .category("Laptops")
                .status(ProductStatus.ACTIVE)
                .version(0L)
                .build();
    }

    @Test
    @DisplayName("Đặt trước tồn kho thành công khi số lượng tồn đủ")
    void shouldReserveStockSuccessfully() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(productRepository.saveAndFlush(any(Product.class))).thenReturn(sampleProduct);

        StockReservationItem item = StockReservationItem.builder()
                .productId(1L)
                .quantity(3)
                .build();

        productService.reserveStock(List.of(item));

        assertThat(sampleProduct.getStockQuantity()).isEqualTo(7);
        verify(productRepository, times(1)).saveAndFlush(sampleProduct);
    }

    @Test
    @DisplayName("Ném ngoại lệ NotEnoughStockException khi số lượng yêu cầu vượt quá tồn kho")
    void shouldThrowNotEnoughStockWhenQuantityExceedsAvailableStock() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));

        StockReservationItem item = StockReservationItem.builder()
                .productId(1L)
                .quantity(15) // available is 10
                .build();

        assertThatThrownBy(() -> productService.reserveStock(List.of(item)))
                .isInstanceOf(NotEnoughStockException.class)
                .hasMessageContaining("không đủ số lượng tồn kho");

        verify(productRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Bắt ObjectOptimisticLockingFailureException và ném NotEnoughStockException khi xảy ra xung đột đồng thời")
    void shouldThrowNotEnoughStockWhenOptimisticLockConflictOccurs() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(productRepository.saveAndFlush(any(Product.class)))
                .thenThrow(new ObjectOptimisticLockingFailureException(Product.class, 1L));

        StockReservationItem item = StockReservationItem.builder()
                .productId(1L)
                .quantity(2)
                .build();

        assertThatThrownBy(() -> productService.reserveStock(List.of(item)))
                .isInstanceOf(NotEnoughStockException.class)
                .hasMessageContaining("Optimistic Lock");
    }

    @Test
    @DisplayName("Khôi phục tồn kho thành công khi đơn hàng bị hủy")
    void shouldRestoreStockSuccessfully() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(productRepository.saveAndFlush(any(Product.class))).thenReturn(sampleProduct);

        StockReservationItem item = StockReservationItem.builder()
                .productId(1L)
                .quantity(4)
                .build();

        productService.restoreStock(List.of(item));

        assertThat(sampleProduct.getStockQuantity()).isEqualTo(14);
        verify(productRepository, times(1)).saveAndFlush(sampleProduct);
    }

    @Test
    @DisplayName("Tạo mới sản phẩm thành công")
    void shouldCreateProductSuccessfully() {
        ProductCreateRequest request = ProductCreateRequest.builder()
                .name("iPhone 16")
                .description("Latest smartphone")
                .price(BigDecimal.valueOf(999.99))
                .stockQuantity(50)
                .category("Phones")
                .build();

        Product createdProduct = Product.builder()
                .id(2L)
                .name("iPhone 16")
                .description("Latest smartphone")
                .price(BigDecimal.valueOf(999.99))
                .stockQuantity(50)
                .category("Phones")
                .status(ProductStatus.ACTIVE)
                .version(0L)
                .build();

        when(categoryRepository.existsByNameIgnoreCase("Phones")).thenReturn(true);
        when(productRepository.save(any(Product.class))).thenReturn(createdProduct);

        ProductResponse response = productService.createProduct(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(2L);
        assertThat(response.getName()).isEqualTo("iPhone 16");
        assertThat(response.getStockQuantity()).isEqualTo(50);
        assertThat(response.getStatus()).isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    @DisplayName("Xóa mềm sản phẩm (set status = INACTIVE)")
    void shouldSoftDeleteProduct() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(productRepository.save(any(Product.class))).thenReturn(sampleProduct);

        productService.deleteProduct(1L);

        assertThat(sampleProduct.getStatus()).isEqualTo(ProductStatus.INACTIVE);
        verify(productRepository, times(1)).save(sampleProduct);
    }

    @Test
    @DisplayName("Ném ResourceNotFoundException khi không tìm thấy sản phẩm")
    void shouldThrowResourceNotFoundWhenProductNotFound() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getProductById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy sản phẩm");
    }

    @Test
    @DisplayName("Lấy danh sách sản phẩm với bộ lọc hợp lệ")
    void shouldGetProductsWithFilterSuccessfully() {
        ProductFilterRequest filter = ProductFilterRequest.builder()
                .keyword("MacBook")
                .minPrice(BigDecimal.valueOf(1000))
                .maxPrice(BigDecimal.valueOf(3000))
                .inStock(true)
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> productPage = new PageImpl<>(List.of(sampleProduct), pageable, 1);

        when(productRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(productPage);

        PagedResponse<ProductResponse> response = productService.getProducts(filter, pageable);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getName()).isEqualTo("MacBook Pro M3");
        verify(productRepository, times(1)).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    @DisplayName("Ném IllegalArgumentException khi minPrice > maxPrice")
    void shouldThrowIllegalArgumentExceptionWhenMinPriceGreaterThanMaxPrice() {
        ProductFilterRequest filter = ProductFilterRequest.builder()
                .minPrice(BigDecimal.valueOf(5000))
                .maxPrice(BigDecimal.valueOf(1000))
                .build();

        Pageable pageable = PageRequest.of(0, 10);

        assertThatThrownBy(() -> productService.getProducts(filter, pageable))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không được lớn hơn");

        verify(productRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("Tạo danh mục mới thành công [ECOM-238]")
    void shouldCreateCategorySuccessfully() {
        CategoryRequest request = CategoryRequest.builder()
                .name("  Phụ Kiện  ")
                .description("Cáp sạc, ốp lưng")
                .imageUrl("https://example.com/accessories.jpg")
                .build();
        Category savedCategory = Category.builder()
                .id(10L)
                .name("Phụ Kiện")
                .description("Cáp sạc, ốp lưng")
                .imageUrl("https://example.com/accessories.jpg")
                .build();

        when(categoryRepository.existsByNameIgnoreCase("Phụ Kiện")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(savedCategory);
        CategoryResponse response = productService.createCategory(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getName()).isEqualTo("Phụ Kiện");
        assertThat(response.getDescription()).isEqualTo("Cáp sạc, ốp lưng");
        verify(categoryRepository, times(1)).existsByNameIgnoreCase("Phụ Kiện");
        verify(categoryRepository, times(1)).save(any(Category.class));
    }

    // =========================================================================
    // [Task ECOM-247] Unit Test cho CRUD sản phẩm (Product CRUD)
    // =========================================================================

    @Test
    @DisplayName("[ECOM-247] Lấy chi tiết sản phẩm theo ID thành công")
    void shouldGetProductByIdSuccessfully() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));

        ProductResponse response = productService.getProductById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("MacBook Pro M3");
        verify(productRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("[ECOM-247] Cập nhật sản phẩm thành công")
    void shouldUpdateProductSuccessfully() {
        ProductUpdateRequest updateRequest = ProductUpdateRequest.builder()
                .name("MacBook Pro M3 Max")
                .description("Updated chip")
                .price(BigDecimal.valueOf(2499.99))
                .stockQuantity(15)
                .category("Laptops")
                .status(ProductStatus.ACTIVE)
                .build();

        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(categoryRepository.existsByNameIgnoreCase("Laptops")).thenReturn(true);
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.updateProduct(1L, updateRequest);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("MacBook Pro M3 Max");
        assertThat(response.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(2499.99));
        assertThat(response.getStockQuantity()).isEqualTo(15);
        verify(productRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(sampleProduct);
    }

    @Test
    @DisplayName("[ECOM-247] Ném ResourceNotFoundException khi cập nhật sản phẩm không tồn tại")
    void shouldThrowResourceNotFoundWhenUpdateNonExistentProduct() {
        ProductUpdateRequest updateRequest = ProductUpdateRequest.builder()
                .name("Non-existent")
                .price(BigDecimal.valueOf(100))
                .stockQuantity(5)
                .build();

        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.updateProduct(999L, updateRequest))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy sản phẩm");

        verify(productRepository, never()).save(any(Product.class));
    }

    // =========================================================================
    // [Task ECOM-132 / ECOM-238 / ECOM-239] Unit Test cho Category Service (CRUD Danh mục)
    // =========================================================================

    @Test
    @DisplayName("[ECOM-108 / ECOM-211] Lấy danh sách danh mục công khai")
    void shouldGetCategoriesSuccessfully() {
        Category cat1 = Category.builder().id(1L).name("Laptops").description("Laptop và máy tính").build();
        Category cat2 = Category.builder().id(2L).name("Smartphones").description("Điện thoại di động").build();

        when(categoryRepository.findAll()).thenReturn(List.of(cat1, cat2));

        List<CategoryResponse> responses = productService.getCategories();

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).getName()).isEqualTo("Laptops");
        assertThat(responses.get(1).getName()).isEqualTo("Smartphones");
        verify(categoryRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("[ECOM-132 / ECOM-238] Tìm kiếm danh mục theo từ khóa")
    void shouldSearchCategoriesSuccessfully() {
        Category cat = Category.builder().id(1L).name("Laptops").description("Laptop và máy tính xách tay").build();

        when(categoryRepository.searchCategoriesByKeyword("laptop")).thenReturn(List.of(cat));

        List<CategoryResponse> responses = productService.searchCategories("laptop");

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getName()).isEqualTo("Laptops");
        verify(categoryRepository, times(1)).searchCategoriesByKeyword("laptop");
    }

    @Test
    @DisplayName("[ECOM-238] Lấy chi tiết danh mục theo ID thành công")
    void shouldGetCategoryByIdSuccessfully() {
        Category cat = Category.builder().id(1L).name("Laptops").description("Laptop cao cấp").build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(cat));

        CategoryResponse response = productService.getCategoryById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Laptops");
        verify(categoryRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("[ECOM-238] Ném ResourceNotFoundException khi không tìm thấy danh mục")
    void shouldThrowResourceNotFoundWhenCategoryNotFound() {
        when(categoryRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getCategoryById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy danh mục");
    }

    @Test
    @DisplayName("Ném DuplicateResourceException khi tạo danh mục trùng tên [ECOM-239]")
    void shouldThrowExceptionWhenCreateCategoryWithExistingName() {
        CategoryRequest request = CategoryRequest.builder()
                .name("Laptop")
                .build();

        when(categoryRepository.existsByNameIgnoreCase("Laptop")).thenReturn(true);

        assertThatThrownBy(() -> productService.createCategory(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("đã tồn tại");

        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("[ECOM-132 / ECOM-238] Cập nhật danh mục thành công")
    void shouldUpdateCategorySuccessfully() {
        Category existingCategory = Category.builder().id(1L).name("Laptops").description("Mô tả cũ").build();
        CategoryRequest request = CategoryRequest.builder()
                .name("Laptops & Ultrabooks")
                .description("Mô tả mới")
                .imageUrl("https://example.com/new.jpg")
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(existingCategory));
        when(categoryRepository.existsByNameIgnoreCase("Laptops & Ultrabooks")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CategoryResponse response = productService.updateCategory(1L, request);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Laptops & Ultrabooks");
        assertThat(response.getDescription()).isEqualTo("Mô tả mới");
        verify(categoryRepository, times(1)).save(existingCategory);
    }

    @Test
    @DisplayName("[ECOM-132 / ECOM-238] Xóa danh mục thành công")
    void shouldDeleteCategorySuccessfully() {
        Category existingCategory = Category.builder().id(1L).name("Laptops").build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(existingCategory));
        doNothing().when(categoryRepository).delete(existingCategory);

        productService.deleteCategory(1L);

        verify(categoryRepository, times(1)).delete(existingCategory);
    }

    @Test
    @DisplayName("Nhập kho thành công: Cộng dồn số lượng và tự động chuyển từ OUT_OF_STOCK sang ACTIVE")
    void shouldInboundStockSuccessfully() {
        Product outOfStockProduct = Product.builder()
                .id(10L)
                .name("AirPods Pro 2")
                .price(BigDecimal.valueOf(249.00))
                .stockQuantity(0)
                .category("Audio")
                .status(ProductStatus.OUT_OF_STOCK)
                .version(1L)
                .build();

        when(productRepository.findById(10L)).thenReturn(Optional.of(outOfStockProduct));
        when(productRepository.saveAndFlush(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StockInboundRequest request = StockInboundRequest.builder()
                .quantity(25)
                .note("Nhập lô hàng chính hãng đợt 1")
                .build();

        ProductResponse response = productService.inboundStock(10L, request);

        assertThat(response.getStockQuantity()).isEqualTo(25);
        assertThat(response.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        verify(productRepository, times(1)).saveAndFlush(outOfStockProduct);
    }

    @Test
    @DisplayName("Điều chỉnh tồn kho thành công: Về 0 tự động chuyển trạng thái sang OUT_OF_STOCK")
    void shouldAdjustStockSuccessfully_AndSetOutOfStockWhenZero() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(productRepository.saveAndFlush(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                .actualStock(0)
                .reason("Kiểm kê cuối tháng phát hiện hết hàng khả dụng")
                .build();

        ProductResponse response = productService.adjustStock(1L, request);

        assertThat(response.getStockQuantity()).isEqualTo(0);
        assertThat(response.getStatus()).isEqualTo(ProductStatus.OUT_OF_STOCK);
        verify(productRepository, times(1)).saveAndFlush(sampleProduct);
    }

    @Test
    @DisplayName("Điều chỉnh tồn kho thất bại: Chặn số lượng tồn kho âm (< 0)")
    void shouldThrowExceptionWhenAdjustStockNegative() {
        StockAdjustmentRequest negativeAdjust = StockAdjustmentRequest.builder()
                .actualStock(-5)
                .reason("Nhập nhầm số liệu kiểm kê")
                .build();

        assertThatThrownBy(() -> productService.adjustStock(1L, negativeAdjust))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không được nhỏ hơn 0");

        verify(productRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Kiểm thử đồng thời (Concurrency): 20 luồng cùng reserveStock cho kho 10 SP - Không bao giờ âm kho")
    void shouldPreventNegativeStockUnderConcurrentReservations() throws InterruptedException {
        final Object dbLock = new Object();
        final AtomicInteger dbStock = new AtomicInteger(10);
        final AtomicLong dbVersion = new AtomicLong(0L);

        when(productRepository.findById(99L)).thenAnswer(invocation -> {
            synchronized (dbLock) {
                return Optional.of(Product.builder()
                        .id(99L)
                        .name("PS5 Pro Limited Edition")
                        .price(BigDecimal.valueOf(699.99))
                        .stockQuantity(dbStock.get())
                        .status(ProductStatus.ACTIVE)
                        .version(dbVersion.get())
                        .build());
            }
        });

        when(productRepository.saveAndFlush(any(Product.class))).thenAnswer(invocation -> {
            Product entity = invocation.getArgument(0);
            synchronized (dbLock) {
                if (!entity.getVersion().equals(dbVersion.get())) {
                    throw new ObjectOptimisticLockingFailureException(Product.class, 99L);
                }
                if (entity.getStockQuantity() < 0) {
                    throw new IllegalStateException("Vi phạm ràng buộc không âm: stock_quantity < 0");
                }
                dbStock.set(entity.getStockQuantity());
                long nextVersion = dbVersion.incrementAndGet();
                entity.setVersion(nextVersion);
                return entity;
            }
        });

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger blockedByNotEnoughStockCount = new AtomicInteger(0);
        AtomicInteger unexpectedErrorCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startGate.await();
                    StockReservationItem item = StockReservationItem.builder()
                            .productId(99L)
                            .quantity(1)
                            .build();

                    boolean completed = false;
                    for (int attempt = 0; attempt < 50 && !completed; attempt++) {
                        try {
                            productService.reserveStock(List.of(item));
                            successCount.incrementAndGet();
                            completed = true;
                        } catch (NotEnoughStockException ex) {
                            if (ex.getMessage() != null && ex.getMessage().contains("Optimistic Lock")) {
                                // Xung đột phiên bản @Version -> thử lại CAS như cơ chế thực tế
                                Thread.yield();
                            } else {
                                blockedByNotEnoughStockCount.incrementAndGet();
                                completed = true;
                            }
                        }
                    }
                    if (!completed) {
                        blockedByNotEnoughStockCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    unexpectedErrorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startGate.countDown();
        boolean finished = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertThat(finished).isTrue();
        assertThat(unexpectedErrorCount.get()).isZero();
        assertThat(dbStock.get()).isZero();
        assertThat(successCount.get()).isEqualTo(10);
        assertThat(blockedByNotEnoughStockCount.get()).isEqualTo(10);
    }

    @Test
    @DisplayName("getProductById trả kèm thông tin activeFlashSale khi sản phẩm đang tham gia Flash Sale hiệu lực")
    void shouldAttachActiveFlashSaleWhenGettingProductById() {
        com.ecommerce.product.dto.response.ActiveFlashSaleDto activeFs =
                com.ecommerce.product.dto.response.ActiveFlashSaleDto.builder()
                        .campaignId(100L)
                        .flashSalePrice(BigDecimal.valueOf(1499.99))
                        .quantity(20)
                        .soldQuantity(5)
                        .remainingStock(15)
                        .userLimit(2)
                        .build();

        when(productRepository.findById(1L)).thenReturn(Optional.of(sampleProduct));
        when(flashSaleService.getActiveFlashSaleForProduct(1L)).thenReturn(activeFs);

        ProductResponse response = productService.getProductById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getPrice()).isEqualByComparingTo("1999.99");
        assertThat(response.getActiveFlashSale()).isNotNull();
        assertThat(response.getActiveFlashSale().getFlashSalePrice()).isEqualByComparingTo("1499.99");
        assertThat(response.getActiveFlashSale().getUserLimit()).isEqualTo(2);
    }
}
