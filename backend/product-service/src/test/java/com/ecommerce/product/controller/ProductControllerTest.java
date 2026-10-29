package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.GlobalExceptionHandler;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ProductService productService;

    @InjectMocks
    private ProductController productController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(productController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/products - Lấy danh sách sản phẩm phân trang")
    void shouldGetProductsList() throws Exception {
        ProductResponse item = ProductResponse.builder()
                .id(1L)
                .name("iPad Air")
                .price(BigDecimal.valueOf(599.99))
                .stockQuantity(20)
                .status(ProductStatus.ACTIVE)
                .build();

        PagedResponse<ProductResponse> pagedResponse = PagedResponse.<ProductResponse>builder()
                .content(List.of(item))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();

        when(productService.getProducts(any(), any(Pageable.class))).thenReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/products")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].name").value("iPad Air"));
    }

    @Test
    @DisplayName("GET /api/v1/products/{id} - Lấy chi tiết sản phẩm")
    void shouldGetProductById() throws Exception {
        ProductResponse item = ProductResponse.builder()
                .id(1L)
                .name("iPad Air")
                .price(BigDecimal.valueOf(599.99))
                .stockQuantity(20)
                .status(ProductStatus.ACTIVE)
                .build();

        when(productService.getProductById(1L)).thenReturn(item);

        mockMvc.perform(get("/api/v1/products/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("iPad Air"));
    }

    @Test
    @DisplayName("GET /api/v1/products/{id} - Trả về 404 khi không tìm thấy")
    void shouldReturn404WhenProductNotFound() throws Exception {
        when(productService.getProductById(99L)).thenThrow(new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: 99"));

        mockMvc.perform(get("/api/v1/products/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Không tìm thấy sản phẩm với ID: 99"));
    }

    @Test
    @DisplayName("POST /api/v1/products - Tạo mới sản phẩm")
    void shouldCreateProduct() throws Exception {
        ProductCreateRequest request = ProductCreateRequest.builder()
                .name("Sony WH-1000XM5")
                .price(BigDecimal.valueOf(399.99))
                .stockQuantity(15)
                .category("Headphones")
                .build();

        ProductResponse response = ProductResponse.builder()
                .id(5L)
                .name("Sony WH-1000XM5")
                .price(BigDecimal.valueOf(399.99))
                .stockQuantity(15)
                .status(ProductStatus.ACTIVE)
                .build();

        when(productService.createProduct(any(ProductCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/products")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(5L))
                .andExpect(jsonPath("$.data.name").value("Sony WH-1000XM5"));
    }

    @Test
    @DisplayName("DELETE /api/v1/products/{id} - Xóa mềm sản phẩm")
    void shouldDeleteProduct() throws Exception {
        doNothing().when(productService).deleteProduct(1L);

        mockMvc.perform(delete("/api/v1/products/1")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa mềm sản phẩm thành công"));

        verify(productService, times(1)).deleteProduct(1L);
    }

    @Test
    @DisplayName("POST /api/v1/products/reserve-stock - Đặt trước tồn kho thành công")
    void shouldReserveStock() throws Exception {
        List<StockReservationItem> items = List.of(
                StockReservationItem.builder().productId(1L).quantity(2).build()
        );

        doNothing().when(productService).reserveStock(any());

        mockMvc.perform(post("/api/v1/products/reserve-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(items)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đặt trước tồn kho thành công"));
    }

    @Test
    @DisplayName("POST /api/v1/products/reserve-stock - Trả về 409 Conflict khi hết hàng hoặc xung đột lock")
    void shouldReturn409WhenStockInsufficient() throws Exception {
        List<StockReservationItem> items = List.of(
                StockReservationItem.builder().productId(1L).quantity(20).build()
        );

        doThrow(new NotEnoughStockException("Không đủ tồn kho")).when(productService).reserveStock(any());

        mockMvc.perform(post("/api/v1/products/reserve-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(items)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("Không đủ tồn kho"));
    }

    @Test
    @DisplayName("POST /api/v1/products/restore-stock - Khôi phục tồn kho thành công")
    void shouldRestoreStock() throws Exception {
        List<StockReservationItem> items = List.of(
                StockReservationItem.builder().productId(1L).quantity(2).build()
        );

        doNothing().when(productService).restoreStock(any());

        mockMvc.perform(post("/api/v1/products/restore-stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(items)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Khôi phục tồn kho thành công"));
    }
}
