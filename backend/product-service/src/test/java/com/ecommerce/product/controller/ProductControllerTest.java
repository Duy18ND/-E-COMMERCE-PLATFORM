package com.ecommerce.product.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

        private MockMvc mockMvc;
        private MockMvc mockMvc;

        @Mock
        private ProductService productService;
        @Mock
        private ProductService productService;

        @InjectMocks
        private ProductController productController;
        @InjectMocks
        private ProductController productController;

        private final ObjectMapper objectMapper = new ObjectMapper();
        private final ObjectMapper objectMapper = new ObjectMapper();

        @BeforeEach
        void setUp() {
                mockMvc = MockMvcBuilders.standaloneSetup(productController)
                                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                                .setControllerAdvice(new GlobalExceptionHandler())
                                .build();
        }

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
        }mockMvc.perform(get("/api/v1/products")
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
                when(productService.getProductById(1L)).thenReturn(item);

                mockMvc.perform(get("/api/v1/products/1")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.name").value("iPad Air"));
        }mockMvc.perform(get("/api/v1/products/1")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.name").value("iPad Air"));
        }

        @Test
        @DisplayName("GET /api/v1/products/{id} - Trả về 404 khi không tìm thấy")
        void shouldReturn404WhenProductNotFound() throws Exception {
                when(productService.getProductById(99L))
                                .thenThrow(new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: 99"));

        @Test
        @DisplayName("GET /api/v1/products/{id} - Trả về 404 khi không tìm thấy")
        void shouldReturn404WhenProductNotFound() throws Exception {
                when(productService.getProductById(99L))
                                .thenThrow(new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: 99"));

                mockMvc.perform(get("/api/v1/products/99")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.error").value("Not Found"))
                                .andExpect(jsonPath("$.message").value("Không tìm thấy sản phẩm với ID: 99"));
        }mockMvc.perform(get("/api/v1/products/99")
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
                ProductResponse response = ProductResponse.builder()
                                .id(5L)
                                .name("Sony WH-1000XM5")
                                .price(BigDecimal.valueOf(399.99))
                                .stockQuantity(15)
                                .status(ProductStatus.ACTIVE)
                                .build();

                when(productService.createProduct(any(ProductCreateRequest.class))).thenReturn(response);
                when(productService.createProduct(any(ProductCreateRequest.class))).thenReturn(response);

                mockMvc.perform(post("/api/v1/products")
                                .header("X-User-Roles", "ROLE_ADMIN")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.id").value(5L))
                                .andExpect(jsonPath("$.data.name").value("Sony WH-1000XM5"));
        }mockMvc.perform(post("/api/v1/products")
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

        @Test
        @DisplayName("DELETE /api/v1/products/{id} - Xóa mềm sản phẩm")
        void shouldDeleteProduct() throws Exception {
                doNothing().when(productService).deleteProduct(1L);

                mockMvc.perform(delete("/api/v1/products/1")
                                .header("X-User-Roles", "ROLE_ADMIN"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message").value("Xóa mềm sản phẩm thành công"));
                mockMvc.perform(delete("/api/v1/products/1")
                                .header("X-User-Roles", "ROLE_ADMIN"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message").value("Xóa mềm sản phẩm thành công"));

                verify(productService, times(1)).deleteProduct(1L);
        }

        verify(productService, times(1)).deleteProduct(1L);
        }

        @Test
        @DisplayName("POST /api/v1/products/reserve-stock - Đặt trước tồn kho thành công")
        void shouldReserveStock() throws Exception {
                List<StockReservationItem> items = List.of(
                                StockReservationItem.builder().productId(1L).quantity(2).build());

        @Test
        @DisplayName("POST /api/v1/products/reserve-stock - Đặt trước tồn kho thành công")
        void shouldReserveStock() throws Exception {
                List<StockReservationItem> items = List.of(
                                StockReservationItem.builder().productId(1L).quantity(2).build());

                doNothing().when(productService).reserveStock(any());
                doNothing().when(productService).reserveStock(any());

                mockMvc.perform(post("/api/v1/products/reserve-stock")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(items)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message").value("Đặt trước tồn kho thành công"));
        }mockMvc.perform(post("/api/v1/products/reserve-stock")
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
                                StockReservationItem.builder().productId(1L).quantity(20).build());

        @Test
        @DisplayName("POST /api/v1/products/reserve-stock - Trả về 409 Conflict khi hết hàng hoặc xung đột lock")
        void shouldReturn409WhenStockInsufficient() throws Exception {
                List<StockReservationItem> items = List.of(
                                StockReservationItem.builder().productId(1L).quantity(20).build());

                doThrow(new NotEnoughStockException("Không đủ tồn kho")).when(productService).reserveStock(any());
                doThrow(new NotEnoughStockException("Không đủ tồn kho")).when(productService).reserveStock(any());

                mockMvc.perform(post("/api/v1/products/reserve-stock")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(items)))
                                .andExpect(status().isConflict())
                                .andExpect(jsonPath("$.error").value("Conflict"))
                                .andExpect(jsonPath("$.message").value("Không đủ tồn kho"));
        }mockMvc.perform(post("/api/v1/products/reserve-stock")
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
                                StockReservationItem.builder().productId(1L).quantity(2).build());

        @Test
        @DisplayName("POST /api/v1/products/restore-stock - Khôi phục tồn kho thành công")
        void shouldRestoreStock() throws Exception {
                List<StockReservationItem> items = List.of(
                                StockReservationItem.builder().productId(1L).quantity(2).build());

                doNothing().when(productService).restoreStock(any());
                doNothing().when(productService).restoreStock(any());

                mockMvc.perform(post("/api/v1/products/restore-stock")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(items)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message").value("Khôi phục tồn kho thành công"));
        }

        /**
         * [Task ECOM-108 / ECOM-211] Kiểm tra Public API lấy danh sách danh mục công
         * khai.
         */
        @Test
        @DisplayName("GET /api/v1/products/categories - Lấy danh mục sản phẩm công khai [ECOM-211]")
        void shouldGetPublicCategories() throws Exception {
                com.ecommerce.product.dto.response.CategoryResponse category = com.ecommerce.product.dto.response.CategoryResponse
                                .builder()
                                .id(1L)
                                .name("Laptop & Workstation")
                                .description("MacBook, Dell XPS")
                                .build();

                when(productService.getCategories()).thenReturn(List.of(category));

                mockMvc.perform(get("/api/v1/products/categories")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data[0].name").value("Laptop & Workstation"));
        }

        /**
         * [Task ECOM-111 / ECOM-112 / ECOM-221] Kiểm tra Public API kiểm tra tồn kho
         * theo mã sản phẩm.
         */
        @Test
        @DisplayName("GET /api/v1/products/{id}/stock - Kiểm tra tồn kho theo mã sản phẩm [ECOM-221]")
        void shouldCheckProductStockById() throws Exception {
                com.ecommerce.product.dto.response.ProductStockResponse stockResponse = com.ecommerce.product.dto.response.ProductStockResponse
                                .builder()
                                .productId(1L)
                                .productName("iPad Air")
                                .stockQuantity(20)
                                .requestedQuantity(2)
                                .status(ProductStatus.ACTIVE)
                                .inStock(true)
                                .sufficientStock(true)
                                .stockStatusMessage("Còn hàng (20 sản phẩm có sẵn)")
                                .build();
                when(productService.checkProductStock(1L, 2)).thenReturn(stockResponse);
                mockMvc.perform(get("/api/v1/products/1/stock")
                                .param("quantity", "2")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.productId").value(1L))
                                .andExpect(jsonPath("$.data.stockQuantity").value(20))
                                .andExpect(jsonPath("$.data.inStock").value(true))
                                .andExpect(jsonPath("$.data.sufficientStock").value(true));
        }

        /**
         * [Task ECOM-114 / ECOM-224 / ECOM-229] Kiểm tra Public API tìm kiếm sản phẩm
         * theo từ khóa.
         */
        @Test
        @DisplayName("GET /api/v1/products/search - Tìm kiếm sản phẩm theo từ khóa thành công [ECOM-229]")
        void shouldSearchProductsByKeyword() throws Exception {
                ProductResponse matchedProduct = ProductResponse.builder()
                                .id(10L)
                                .name("MacBook Air M2 13 inch")
                                .category("Laptop & Workstation")
                                .price(BigDecimal.valueOf(24500000))
                                .stockQuantity(8)
                                .status(ProductStatus.ACTIVE)
                                .build();
                PagedResponse<ProductResponse> pagedResponse = PagedResponse.<ProductResponse>builder()
                                .content(List.of(matchedProduct))
                                .pageNumber(0)
                                .pageSize(10)
                                .totalElements(1)
                                .totalPages(1)
                                .last(true)
                                .build();
                when(productService.searchProducts(eq("MacBook"), any(Pageable.class))).thenReturn(pagedResponse);
                mockMvc.perform(get("/api/v1/products/search")
                                .param("keyword", "MacBook")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message").value("Tìm kiếm sản phẩm theo từ khóa thành công"))
                                .andExpect(jsonPath("$.data.totalElements").value(1))
                                .andExpect(jsonPath("$.data.content[0].name").value("MacBook Air M2 13 inch"));
        }

        /**
         * [Task ECOM-132 / ECOM-238 / ECOM-239] Kiểm tra tạo mới danh mục thành công
         * với quyền ADMIN.
         */
        @Test
        @DisplayName("POST /api/v1/products/categories - Tạo mới danh mục thành công [ADMIN] [ECOM-238]")
        void shouldCreateCategorySuccessfully() throws Exception {
                com.ecommerce.product.dto.request.CategoryRequest request = com.ecommerce.product.dto.request.CategoryRequest
                                .builder()
                                .name("Thiết bị mạng")
                                .description("Router WiFi 6, Mesh WiFi chính hãng")
                                .imageUrl("https://example.com/wifi.jpg")
                                .build();
                com.ecommerce.product.dto.response.CategoryResponse response = com.ecommerce.product.dto.response.CategoryResponse
                                .builder()
                                .id(5L)
                                .name("Thiết bị mạng")
                                .description("Router WiFi 6, Mesh WiFi chính hãng")
                                .imageUrl("https://example.com/wifi.jpg")
                                .build();
                when(productService.createCategory(any(com.ecommerce.product.dto.request.CategoryRequest.class)))
                                .thenReturn(response);
                mockMvc.perform(post("/api/v1/products/categories")
                                .header("X-User-Roles", "ROLE_ADMIN")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.id").value(5L))
                                .andExpect(jsonPath("$.data.name").value("Thiết bị mạng"));
        }

        /**
         * [Task ECOM-239] Kiểm tra chặn người dùng không phải ADMIN khi thêm danh mục
         * (trả về 403 Forbidden).
         */
        @Test
        @DisplayName("POST /api/v1/products/categories - Trả về 403 Forbidden khi không có quyền ADMIN [ECOM-239]")
        void shouldReturn403WhenCreateCategoryWithoutAdminRole() throws Exception {
                com.ecommerce.product.dto.request.CategoryRequest request = com.ecommerce.product.dto.request.CategoryRequest
                                .builder()
                                .name("Thiết bị mạng")
                                .build();
                mockMvc.perform(post("/api/v1/products/categories")
                                .header("X-User-Roles", "ROLE_USER")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.error").value("Forbidden"));
        }

        /**
         * [Task ECOM-132 / ECOM-238] Kiểm tra cập nhật và xóa danh mục với quyền ADMIN.
         */
        @Test
        @DisplayName("PUT & DELETE /api/v1/products/categories/{id} - Cập nhật và xóa danh mục [ADMIN] [ECOM-238]")
        void shouldUpdateAndDeleteCategorySuccessfully() throws Exception {
                com.ecommerce.product.dto.request.CategoryRequest updateRequest = com.ecommerce.product.dto.request.CategoryRequest
                                .builder()
                                .name("Laptop Gaming")
                                .description("Laptop cấu hình cao")
                                .build();
                com.ecommerce.product.dto.response.CategoryResponse updatedResponse = com.ecommerce.product.dto.response.CategoryResponse
                                .builder()
                                .id(1L)
                                .name("Laptop Gaming")
                                .description("Laptop cấu hình cao")
                                .build();
                when(productService.updateCategory(eq(1L),
                                any(com.ecommerce.product.dto.request.CategoryRequest.class)))
                                .thenReturn(updatedResponse);
                doNothing().when(productService).deleteCategory(1L);
                mockMvc.perform(put("/api/v1/products/categories/1")
                                .header("X-User-Roles", "ROLE_ADMIN")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(updateRequest)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.name").value("Laptop Gaming"));
                mockMvc.perform(delete("/api/v1/products/categories/1")
                                .header("X-User-Roles", "ROLE_ADMIN"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message").value("Xóa danh mục thành công"));
        }

        /**
         * [Task ECOM-133 / ECOM-135] Kiểm tra API lấy danh sách sản phẩm phân trang
         * dành cho Admin.
         */
        @Test
        @DisplayName("GET /api/v1/products/admin - Lấy danh sách sản phẩm phân trang cho Admin [ECOM-135]")
        void shouldGetAdminProductsSuccessfully() throws Exception {
                ProductResponse inactiveProduct = ProductResponse.builder()
                                .id(2L)
                                .name("iPhone 14 Pro")
                                .price(BigDecimal.valueOf(999.00))
                                .stockQuantity(0)
                                .status(ProductStatus.INACTIVE)
                                .build();
                PagedResponse<ProductResponse> pagedResponse = PagedResponse.<ProductResponse>builder()
                                .content(List.of(inactiveProduct))
                                .pageNumber(0)
                                .pageSize(10)
                                .totalElements(1)
                                .totalPages(1)
                                .last(true)
                                .build();
                when(productService.getAdminProducts(eq("iPhone"), eq(ProductStatus.INACTIVE), any(Pageable.class)))
                                .thenReturn(pagedResponse);
                mockMvc.perform(get("/api/v1/products/admin")
                                .header("X-User-Roles", "ROLE_ADMIN")
                                .param("keyword", "iPhone")
                                .param("status", "INACTIVE")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content[0].name").value("iPhone 14 Pro"))
                                .andExpect(jsonPath("$.data.content[0].status").value("INACTIVE"));
        }

        /**
         * [Task ECOM-248] Kiểm tra validate giá sản phẩm (<= 0) và số lượng tồn kho (<
         * 0)
         * phải trả về 400 Bad Request.
         */
        @Test
        @DisplayName("POST /api/v1/products - Trả về 400 Bad Request khi giá <= 0 hoặc số lượng < 0 [ECOM-248]")
        void shouldReturn400WhenInvalidPriceOrStockQuantity() throws Exception {
                ProductCreateRequest invalidRequest = ProductCreateRequest.builder()
                                .name("Sản phẩm lỗi giá và tồn kho")
                                .price(BigDecimal.valueOf(-100))
                                .stockQuantity(-5)
                                .category("Electronics")
                                .build();
                mockMvc.perform(post("/api/v1/products")
                                .header("X-User-Roles", "ROLE_ADMIN")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(invalidRequest)))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value("Validation Failed"))
                                .andExpect(jsonPath("$.errors.price").value("Giá sản phẩm phải lớn hơn 0"))
                                .andExpect(jsonPath("$.errors.stockQuantity")
                                                .value("Số lượng tồn kho không được nhỏ hơn 0"));
        }

        /**
         * [Task ECOM-248] Kiểm tra chặn người dùng không có quyền ROLE_ADMIN khi thao
         * tác sản phẩm
         * phải trả về 403 Forbidden.
         */
        @Test
        @DisplayName("POST /api/v1/products - Trả về 403 Forbidden khi không có quyền ADMIN [ECOM-248]")
        void shouldReturn403WhenCreateProductWithoutAdminRole() throws Exception {
                ProductCreateRequest validRequest = ProductCreateRequest.builder()
                                .name("Sony WH-1000XM5")
                                .price(BigDecimal.valueOf(399.99))
                                .stockQuantity(10)
                                .category("Headphones")
                                .build();
                mockMvc.perform(post("/api/v1/products")
                                .header("X-User-Roles", "ROLE_USER")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(validRequest)))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.error").value("Forbidden"));
        }
}
