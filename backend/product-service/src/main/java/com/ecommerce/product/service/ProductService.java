package com.ecommerce.product.service;

import java.util.List;

import org.springframework.data.domain.Pageable;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.dto.response.ProductStockResponse;
import com.ecommerce.product.enums.ProductStatus;

public interface ProductService {

    /**
     * Get paginated products, optionally filtered by keyword. Cached in Redis.
     */
    PagedResponse<ProductResponse> getProducts(String keyword, Pageable pageable);

    /**
     * Get product details by ID.
     */
    ProductResponse getProductById(Long id);

    /**
     * Create a new product and invalidate products cache.
     */
    ProductResponse createProduct(ProductCreateRequest request);

    /**
     * Update existing product and invalidate products cache.
     */
    ProductResponse updateProduct(Long id, ProductUpdateRequest request);

    /**
     * Soft delete product by changing status to INACTIVE.
     */
    void deleteProduct(Long id);

    /**
     * Reserve inventory for multiple items with Optimistic Locking.
     */
    void reserveStock(List<StockReservationItem> items);

    /**
     * Restore inventory when an order is cancelled.
     */
    void restoreStock(List<StockReservationItem> items);

    /**
     * Lấy danh sách tất cả các danh mục sản phẩm công khai.
     */
    List<CategoryResponse> getCategories();

    /**
     * [Task ECOM-111 / ECOM-112 / ECOM-221] Kiểm tra tồn kho hiện tại theo mã sản
     * phẩm (productId)
     * và số lượng yêu cầu (quantity).
     */
    ProductStockResponse checkProductStock(Long id, Integer quantity);

    /**
     * [Task ECOM-114 / ECOM-224 / ECOM-229] Tìm kiếm danh sách sản phẩm công khai
     * theo từ khóa (keyword)
     * có hỗ trợ phân trang và sắp xếp.
     */
    PagedResponse<ProductResponse> searchProducts(String keyword, Pageable pageable);

    /**
     * [Task ECOM-132 / ECOM-238] Tìm kiếm danh mục sản phẩm theo từ khóa (dành cho
     * Admin & User).
     */
    List<CategoryResponse> searchCategories(String keyword);

    /**
     * [Task ECOM-238] Lấy thông tin chi tiết một danh mục theo ID.
     */
    CategoryResponse getCategoryById(Long id);

    /**
     * [Task ECOM-132 / ECOM-238 / ECOM-239] Tạo mới danh mục sản phẩm (chỉ dành cho
     * ADMIN).
     */
    CategoryResponse createCategory(CategoryRequest request);

    /**
     * [Task ECOM-132 / ECOM-238 / ECOM-239] Cập nhật thông tin danh mục theo ID
     * (chỉ dành cho ADMIN).
     */
    CategoryResponse updateCategory(Long id, CategoryRequest request);

    /**
     * [Task ECOM-132 / ECOM-238] Xóa danh mục sản phẩm theo ID (chỉ dành cho
     * ADMIN).
     */
    void deleteCategory(Long id);

    /**
     * [Task ECOM-133 / ECOM-135] Lấy danh sách sản phẩm có phân trang dành riêng
     * cho Admin
     * (hỗ trợ lọc theo từ khóa và trạng thái sản phẩm: ACTIVE, INACTIVE,
     * OUT_OF_STOCK).
     */
    PagedResponse<ProductResponse> getAdminProducts(String keyword, ProductStatus status, Pageable pageable);
}
