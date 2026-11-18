package com.ecommerce.chatbot.tool;

import com.ecommerce.chatbot.client.OrderClient;
import com.ecommerce.chatbot.client.ProductClient;
import com.ecommerce.chatbot.client.dto.*;
import com.ecommerce.chatbot.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * AI Tool Calling component for Product Search, Recommendations, Details, Comparison, Stock & Promotions.
 * Strictly read-only; calls product-service and order-service via OpenFeign.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProductShoppingTools {

    private final ProductClient productClient;
    private final OrderClient orderClient;

    public List<ProductDto> searchProducts(
            String keyword,
            String category,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean inStockOnly,
            String sort,
            int limit
    ) {
        int safeSize = Math.min(Math.max(1, limit), 8);
        try {
            ApiResponse<PagedData<ProductDto>> response = productClient.getProducts(
                    keyword, category, minPrice, maxPrice, inStockOnly, 0, safeSize, sort
            );
            if (response != null && response.getData() != null && response.getData().getContent() != null) {
                return response.getData().getContent();
            }
        } catch (Exception ex) {
            log.warn("[ProductShoppingTools] searchProducts failed: {}", ex.getMessage());
        }
        return Collections.emptyList();
    }

    public ProductDto getProductDetail(Long productId) {
        return getProductDetails(productId);
    }

    public ProductDto getProductDetails(Long productId) {
        if (productId == null || productId <= 0) {
            return null;
        }
        try {
            ApiResponse<ProductDto> res = productClient.getProductById(productId);
            ProductDto product = res != null ? res.getData() : null;
            if (product != null) {
                try {
                    ApiResponse<ReviewSummaryDto> reviewRes = productClient.getProductReviews(productId, 0, 1);
                    if (reviewRes != null && reviewRes.getData() != null) {
                        product.setAverageRating(reviewRes.getData().getAverageRating());
                        product.setTotalReviews(reviewRes.getData().getTotalReviews());
                    }
                } catch (Exception ignored) {
                    // Reviews are optional enrichment
                }
            }
            return product;
        } catch (Exception ex) {
            log.warn("[ProductShoppingTools] getProductDetail({}) failed: {}", productId, ex.getMessage());
            return null;
        }
    }

    public List<ProductDto> compareProducts(List<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<ProductDto> results = new ArrayList<>();
        for (Long id : productIds.stream().filter(Objects::nonNull).distinct().limit(4).toList()) {
            ProductDto detail = getProductDetail(id);
            if (detail != null) {
                results.add(detail);
            }
        }
        return results;
    }

    public ProductStockDto getProductStock(Long productId, Integer requestedQuantity) {
        return checkProductStock(productId, requestedQuantity);
    }

    public ProductStockDto checkProductStock(Long productId, Integer requestedQuantity) {
        if (productId == null || productId <= 0) {
            return null;
        }
        int qty = (requestedQuantity != null && requestedQuantity > 0) ? requestedQuantity : 1;
        try {
            ApiResponse<ProductStockDto> res = productClient.checkProductStock(productId, qty);
            return res != null ? res.getData() : null;
        } catch (Exception ex) {
            log.warn("[ProductShoppingTools] getProductStock({}) failed: {}", productId, ex.getMessage());
            return null;
        }
    }

    public List<CategoryDto> getCategories() {
        try {
            ApiResponse<List<CategoryDto>> res = productClient.getCategories();
            return (res != null && res.getData() != null) ? res.getData() : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("[ProductShoppingTools] getCategories failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<VoucherDto> getActiveVouchers(Long authenticatedUserId) {
        try {
            ApiResponse<List<VoucherDto>> res = orderClient.getActiveVouchers(authenticatedUserId);
            return (res != null && res.getData() != null) ? res.getData() : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("[ProductShoppingTools] getActiveVouchers failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}

