package com.ecommerce.product.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductFilterRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.dto.response.ProductStockResponse;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.service.ProductService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Tag(name = "Product Controller", description = "Quản lý danh mục sản phẩm và tồn kho")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Lấy danh sách sản phẩm", description = "Lấy danh sách sản phẩm có tìm kiếm, lọc theo danh mục (category/categoryId), khoảng giá, tồn kho, phân trang và sắp xếp")
    public ResponseEntity<ApiResponse<PagedResponse<ProductResponse>>> getProducts(
            @Valid @ModelAttribute ProductFilterRequest filterRequest,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        PagedResponse<ProductResponse> response = productService.getProducts(filterRequest, pageable);
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

    /**
     * [Task ECOM-106 / ECOM-108 / ECOM-211] Public API lấy danh sách danh mục sản
     * phẩm công khai.
     */
    @GetMapping("/categories")
    @Operation(summary = "Lấy danh mục sản phẩm công khai", description = "Cho phép khách vãng lai và người dùng lấy danh mục sản phẩm phục vụ hiển thị menu/bộ lọc")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories() {
        List<CategoryResponse> response = productService.getCategories();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục sản phẩm thành công", response));
    }

    /**
     * [Task ECOM-111 / ECOM-112 / ECOM-221] Public API kiểm tra tồn kho theo mã sản
     * phẩm (id).
     * Endpoint: GET /api/v1/products/{id}/stock?quantity=1
     * Cho phép Guest và User kiểm tra nhanh sản phẩm còn hàng hay hết hàng mà không
     * cần đăng nhập.
     */
    @GetMapping("/{id}/stock")
    @Operation(summary = "Kiểm tra tồn kho theo mã sản phẩm", description = "Kiểm tra số lượng tồn kho hiện tại và trạng thái còn hàng của sản phẩm theo ID")
    public ResponseEntity<ApiResponse<ProductStockResponse>> checkProductStock(
            @PathVariable Long id,
            @RequestParam(value = "quantity", required = false, defaultValue = "1") Integer quantity) {
        ProductStockResponse response = productService.checkProductStock(id, quantity);
        return ResponseEntity.ok(ApiResponse.success("Kiểm tra tồn kho sản phẩm thành công", response));
    }

    /**
     * [Task ECOM-114 / ECOM-224 / ECOM-229] Public API tìm kiếm sản phẩm theo từ
     * khóa.
     * Endpoint: GET /api/v1/products/search?keyword=... (hoặc ?search=...)
     * - Mở công khai (permitAll) cho cả Guest và User.
     * - Hỗ trợ nhận tham số từ khóa qua cả `keyword` hoặc `search` (tương thích với
     * Frontend productService.js).
     */
    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm sản phẩm theo từ khóa", description = "Public API tìm kiếm sản phẩm theo tên, danh mục hoặc mô tả có phân trang")
    public ResponseEntity<ApiResponse<PagedResponse<ProductResponse>>> searchProducts(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "search", required = false) String search,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        // Ưu tiên lấy keyword; nếu FE truyền ?search=... thì lấy giá trị từ search
        String resolvedKeyword = StringUtils.hasText(keyword) ? keyword : search;
        PagedResponse<ProductResponse> response = productService.searchProducts(resolvedKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Tìm kiếm sản phẩm theo từ khóa thành công", response));
    }

    /**
     * [Task ECOM-132 / ECOM-238] API tìm kiếm danh mục sản phẩm theo từ khóa.
     * Endpoint: GET /api/v1/products/categories/search?keyword=...
     */
    @GetMapping("/categories/search")
    @Operation(summary = "Tìm kiếm danh mục sản phẩm", description = "Tìm kiếm danh mục theo tên hoặc mô tả")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> searchCategories(
            @RequestParam(value = "keyword", required = false) String keyword) {
        List<CategoryResponse> response = productService.searchCategories(keyword);
        return ResponseEntity.ok(ApiResponse.success("Tìm kiếm danh mục sản phẩm thành công", response));
    }

    /**
     * [Task ECOM-238] API lấy thông tin chi tiết một danh mục theo ID.
     * Endpoint: GET /api/v1/products/categories/{id}
     */
    @GetMapping("/categories/{id}")
    @Operation(summary = "Lấy chi tiết danh mục", description = "Lấy thông tin chi tiết một danh mục sản phẩm theo ID")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        CategoryResponse response = productService.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin danh mục thành công", response));
    }

    /**
     * [Task ECOM-132 / ECOM-238 / ECOM-239] API Thêm mới danh mục sản phẩm [ADMIN].
     * Endpoint: POST /api/v1/products/categories
     * Yêu cầu quyền ROLE_ADMIN qua header X-User-Roles và kiểm tra dữ liệu hợp lệ
     * (@Valid).
     */
    @PostMapping("/categories")
    @Operation(summary = "Tạo mới danh mục [ADMIN]", description = "Chỉ ADMIN được phép thêm mới danh mục sản phẩm")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @Valid @RequestBody CategoryRequest request) {
        requireAdminRole(roles);
        CategoryResponse response = productService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo danh mục mới thành công", response));
    }

    /**
     * [Task ECOM-132 / ECOM-238 / ECOM-239] API Cập nhật danh mục sản phẩm [ADMIN].
     * Endpoint: PUT /api/v1/products/categories/{id}
     * Yêu cầu quyền ROLE_ADMIN qua header X-User-Roles và kiểm tra dữ liệu hợp lệ
     * (@Valid).
     */
    @PutMapping("/categories/{id}")
    @Operation(summary = "Cập nhật danh mục [ADMIN]", description = "Chỉ ADMIN được phép cập nhật thông tin danh mục sản phẩm")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        requireAdminRole(roles);
        CategoryResponse response = productService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục thành công", response));
    }

    /**
     * [Task ECOM-132 / ECOM-238 / ECOM-239] API Xóa danh mục sản phẩm [ADMIN].
     * Endpoint: DELETE /api/v1/products/categories/{id}
     * Yêu cầu quyền ROLE_ADMIN qua header X-User-Roles.
     */
    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Xóa danh mục [ADMIN]", description = "Chỉ ADMIN được phép xóa danh mục sản phẩm")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {
        requireAdminRole(roles);
        productService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa danh mục thành công", null));
    }

    /**
     * [Task ECOM-133 / ECOM-135 / ECOM-248] API lấy danh sách sản phẩm phân trang
     * dành cho Admin.
     * Endpoint: GET /api/v1/products/admin?keyword=...&status=...
     * - Yêu cầu quyền ROLE_ADMIN qua header X-User-Roles.
     * - Cho phép Admin xem toàn bộ sản phẩm (bao gồm cả ACTIVE, INACTIVE đã xóa
     * mềm, OUT_OF_STOCK).
     */
    @GetMapping("/admin")
    @Operation(summary = "Lấy danh sách sản phẩm phân trang [ADMIN]", description = "Chỉ ADMIN được phép xem toàn bộ danh sách sản phẩm (kể cả sản phẩm đã xóa mềm INACTIVE) có phân trang và lọc theo trạng thái")
    public ResponseEntity<ApiResponse<PagedResponse<ProductResponse>>> getAdminProducts(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) ProductStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        requireAdminRole(roles);
        PagedResponse<ProductResponse> response = productService.getAdminProducts(keyword, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm cho Admin thành công", response));
    }
}
