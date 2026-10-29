package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductFilterRequest;
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
        when(productRepository.save(any(Product.class))).thenReturn(sampleProduct);

        StockReservationItem item = StockReservationItem.builder()
                .productId(1L)
                .quantity(4)
                .build();

        productService.restoreStock(List.of(item));

        assertThat(sampleProduct.getStockQuantity()).isEqualTo(14);
        verify(productRepository, times(1)).save(sampleProduct);
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
}
