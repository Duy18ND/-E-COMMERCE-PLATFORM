package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.exception.AccessDeniedException;
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
    @Operation(summary = "Tạo mới sản phẩm [ADMIN]", description = "Chỉ ADMIN được phép tạo sản phẩm. Lấy role từ header X-User-Roles do API Gateway truyền xuống.")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @Valid @RequestBody ProductCreateRequest request) {

        requireAdminRole(roles);
        ProductResponse response = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo sản phẩm mới thành công", response));
    }

    @PutMapping("/{id}")
    @CacheEvict(value = "products", allEntries = true)
    @Operation(summary = "Cập nhật sản phẩm [ADMIN]", description = "Chỉ ADMIN được phép cập nhật sản phẩm. Lấy role từ header X-User-Roles do API Gateway truyền xuống.")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id,
            @Valid @RequestBody ProductUpdateRequest request) {

        requireAdminRole(roles);
        ProductResponse response = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sản phẩm thành công", response));
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = "products", allEntries = true)
    @Operation(summary = "Xóa mềm sản phẩm [ADMIN]", description = "Chỉ ADMIN được phép xóa (mềm) sản phẩm. Chuyển trạng thái sang INACTIVE.")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {

        requireAdminRole(roles);
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa mềm sản phẩm thành công", null));
    }

    // ─── Helper: kiểm tra quyền ADMIN ─────────────────────────────────────────
    /**
     * Kiểm tra xem roles header có chứa ROLE_ADMIN không.
     * Nếu không, ném AccessDeniedException (HTTP 403).
     *
     * @param roles chuỗi roles nhận từ API Gateway qua header X-User-Roles
     */
    private void requireAdminRole(String roles) {
        if (roles == null || !roles.contains("ROLE_ADMIN")) {
            throw new AccessDeniedException("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này");
        }
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
