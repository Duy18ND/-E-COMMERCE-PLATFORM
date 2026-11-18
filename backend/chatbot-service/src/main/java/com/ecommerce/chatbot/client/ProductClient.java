package com.ecommerce.chatbot.client;

import com.ecommerce.chatbot.client.dto.*;
import com.ecommerce.chatbot.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.util.List;

@FeignClient(name = "product-service")
public interface ProductClient {

    @GetMapping("/api/v1/products")
    ApiResponse<PagedData<ProductDto>> getProducts(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "minPrice", required = false) BigDecimal minPrice,
            @RequestParam(value = "maxPrice", required = false) BigDecimal maxPrice,
            @RequestParam(value = "inStock", required = false) Boolean inStock,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "8") int size,
            @RequestParam(value = "sort", required = false) String sort
    );

    @GetMapping("/api/v1/products/{id}")
    ApiResponse<ProductDto> getProductById(@PathVariable("id") Long id);

    @GetMapping("/api/v1/products/{id}/stock")
    ApiResponse<ProductStockDto> checkProductStock(
            @PathVariable("id") Long id,
            @RequestParam(value = "quantity", defaultValue = "1") Integer quantity
    );

    @GetMapping("/api/v1/products/categories")
    ApiResponse<List<CategoryDto>> getCategories();

    @GetMapping("/api/v1/products/{productId}/reviews")
    ApiResponse<ReviewSummaryDto> getProductReviews(
            @PathVariable("productId") Long productId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "1") int size
    );
}

