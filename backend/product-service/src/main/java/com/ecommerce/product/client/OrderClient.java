package com.ecommerce.product.client;

import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign Client g?i sang Order Service ð? xác minh ðõn hàng trý?c khi cho phép ðánh giá s?n ph?m.
 * S? d?ng service name "order-service" ð? ðãng k? trên Eureka.
 */
@FeignClient(name = "order-service", path = "/api/v1/orders")
public interface OrderClient {

    /**
     * L?y chi ti?t ðõn hàng theo ID.
     * Ðý?c dùng ð? ki?m tra: ðõn hàng có status DELIVERED không? Có ch?a productId không?
     *
     * @param id ID ðõn hàng
     * @return ApiResponse ch?a OrderDetailResponse
     */
    @GetMapping("/{id}")
    ApiResponse<OrderDetailResponse> getOrderById(@PathVariable("id") Long id);
}
