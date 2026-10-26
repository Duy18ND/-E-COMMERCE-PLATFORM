package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.impl.ProductServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
}
