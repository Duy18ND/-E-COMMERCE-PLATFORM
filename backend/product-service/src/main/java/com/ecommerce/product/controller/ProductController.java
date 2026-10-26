package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Tag(name = "Product Controller", description = "Quản lý danh mục sản phẩm và tồn kho")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Cacheable(value = "products", key = "#pageable.pageNumber + '-' + #pageable.pageSize")
    @Operation(summary = "Lấy danh sách sản phẩm", description = "Lấy danh sách sản phẩm có phân trang và Redis cache")
    public ResponseEntity<ApiResponse<PagedResponse<ProductResponse>>> getProducts(
            @RequestParam(value = "keyword", required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        PagedResponse<ProductResponse> response = productService.getProducts(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm thành công", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết sản phẩm", description = "Lấy thông tin chi tiết một sản phẩm theo ID")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        ProductResponse response = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin sản phẩm thành công", response));
    }

    @PostMapping
    @CacheEvict(value = "products", allEntries = true)
    @Operation(summary = "Tạo mới sản phẩm", description = "Tạo một sản phẩm mới và xóa toàn bộ cache products")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody ProductCreateRequest request) {

        ProductResponse response = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo sản phẩm mới thành công", response));
    }

    @PutMapping("/{id}")
    @CacheEvict(value = "products", allEntries = true)
    @Operation(summary = "Cập nhật sản phẩm", description = "Cập nhật thông tin sản phẩm theo ID và xóa cache")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductUpdateRequest request) {

        ProductResponse response = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sản phẩm thành công", response));
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = "products", allEntries = true)
    @Operation(summary = "Xóa mềm sản phẩm", description = "Chuyển trạng thái sản phẩm sang INACTIVE")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mềm sản phẩm thành công", null));
    }

    @PostMapping("/reserve-stock")
    @Operation(summary = "Đặt trước tồn kho", description = "API nội bộ cho Order Service để giữ và trừ số lượng kho với Optimistic Lock")
    public ResponseEntity<ApiResponse<Void>> reserveStock(
            @Valid @RequestBody List<StockReservationItem> items) {

        productService.reserveStock(items);
        return ResponseEntity.ok(ApiResponse.success("Đặt trước tồn kho thành công", null));
    }

    @PostMapping("/restore-stock")
    @Operation(summary = "Khôi phục tồn kho", description = "API nội bộ cho Order Service để hoàn lại tồn kho khi đơn hàng bị hủy")
    public ResponseEntity<ApiResponse<Void>> restoreStock(
            @Valid @RequestBody List<StockReservationItem> items) {

        productService.restoreStock(items);
        return ResponseEntity.ok(ApiResponse.success("Khôi phục tồn kho thành công", null));
    }
}
