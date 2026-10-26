package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ProductResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

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
}
